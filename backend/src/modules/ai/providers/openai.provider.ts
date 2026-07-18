import { Logger } from '@nestjs/common';
import OpenAI from 'openai';
import type {
  ChatCompletionMessageParam,
  ChatCompletionTool,
} from 'openai/resources/chat/completions';
import {
  AiProvider,
  AiStreamParams,
  AiStreamResult,
  SqlExecutionResult,
} from '../ai-provider.interface';
import { estimateCostUsd } from '../pricing.util';

/** Safety cap on tool-call rounds to prevent a runaway agentic loop. */
const MAX_TOOL_ROUNDS = 5;

/** Thrown by the SQL executor when validation fails — surfaced as tool_error. */
type ToolError = { message: string };

/**
 * OpenAI implementation of {@link AiProvider} using Chat Completions with
 * function calling and native token streaming.
 */
export class OpenAiProvider implements AiProvider {
  readonly name = 'openai' as const;
  private readonly logger = new Logger(OpenAiProvider.name);

  constructor(
    private readonly client: OpenAI,
    private readonly model: string,
  ) {}

  async streamChat(params: AiStreamParams): Promise<AiStreamResult> {
    const { system, messages, tool, executeSql, onEvent, signal } = params;

    const conversation: ChatCompletionMessageParam[] = [
      { role: 'system', content: system },
      ...messages.map((m) => ({ role: m.role, content: m.content })),
    ];

    const tools: ChatCompletionTool[] = [
      {
        type: 'function',
        function: {
          name: tool.name,
          description: tool.description,
          parameters: tool.inputSchema,
        },
      },
    ];

    let content = '';
    let promptTokens = 0;
    let completionTokens = 0;

    for (let round = 0; round < MAX_TOOL_ROUNDS; round++) {
      const stream = await this.client.chat.completions.create(
        {
          model: this.model,
          messages: conversation,
          tools,
          stream: true,
          stream_options: { include_usage: true },
        },
        { signal },
      );

      let textThisRound = '';
      const toolCalls = new Map<
        number,
        { id: string; name: string; args: string }
      >();
      let finishReason: string | null = null;

      try {
        for await (const chunk of stream) {
          const choice = chunk.choices[0];
          if (chunk.usage) {
            promptTokens = chunk.usage.prompt_tokens;
            completionTokens = chunk.usage.completion_tokens;
          }
          if (!choice) continue;

          const delta = choice.delta;
          if (delta?.content) {
            textThisRound += delta.content;
            content += delta.content;
            onEvent({ type: 'token', content: delta.content });
          }
          for (const tc of delta?.tool_calls ?? []) {
            const entry = toolCalls.get(tc.index) ?? {
              id: '',
              name: '',
              args: '',
            };
            if (tc.id) entry.id = tc.id;
            if (tc.function?.name) entry.name = tc.function.name;
            if (tc.function?.arguments) entry.args += tc.function.arguments;
            toolCalls.set(tc.index, entry);
          }
          if (choice.finish_reason) finishReason = choice.finish_reason;
        }
      } catch (err) {
        if (signal.aborted) break;
        throw err;
      }

      if (finishReason !== 'tool_calls' || toolCalls.size === 0) {
        break; // Model produced its final answer.
      }

      // Record the assistant's tool-call turn so the follow-up call has context.
      conversation.push({
        role: 'assistant',
        content: textThisRound || null,
        tool_calls: [...toolCalls.values()].map((c) => ({
          id: c.id,
          type: 'function',
          function: { name: c.name, arguments: c.args },
        })),
      });

      const toolError = await this.runToolCalls(
        toolCalls,
        executeSql,
        conversation,
        onEvent,
      );
      if (toolError) {
        onEvent({ type: 'tool_error', message: toolError.message });
        break;
      }
      if (signal.aborted) break;
    }

    return {
      content,
      usage: {
        promptTokens,
        completionTokens,
        totalTokens: promptTokens + completionTokens,
        estimatedCostUsd: estimateCostUsd(
          this.name,
          this.model,
          promptTokens,
          completionTokens,
        ),
      },
    };
  }

  /**
   * Executes each requested tool call, emitting tool_* events and appending
   * the results to the conversation. Returns a ToolError if any call fails
   * validation/execution (stops the loop), otherwise null.
   */
  private async runToolCalls(
    toolCalls: Map<number, { id: string; name: string; args: string }>,
    executeSql: AiStreamParams['executeSql'],
    conversation: ChatCompletionMessageParam[],
    onEvent: AiStreamParams['onEvent'],
  ): Promise<ToolError | null> {
    for (const call of toolCalls.values()) {
      onEvent({ type: 'tool_start' });
      const query = this.parseQuery(call.args);
      onEvent({ type: 'tool_query', query });

      let result: SqlExecutionResult;
      try {
        result = await executeSql(query);
      } catch (err) {
        return { message: err instanceof Error ? err.message : String(err) };
      }
      onEvent({ type: 'tool_end', rowCount: result.rowCount });

      conversation.push({
        role: 'tool',
        tool_call_id: call.id,
        content: JSON.stringify(result.rows),
      });
    }
    return null;
  }

  /** Extracts the `query` field from the model's (possibly partial) JSON args. */
  private parseQuery(args: string): string {
    try {
      const parsed: unknown = JSON.parse(args || '{}');
      if (
        parsed &&
        typeof parsed === 'object' &&
        'query' in parsed &&
        typeof (parsed as { query: unknown }).query === 'string'
      ) {
        return (parsed as { query: string }).query;
      }
    } catch (err) {
      this.logger.warn(`Failed to parse tool arguments: ${String(err)}`);
    }
    return '';
  }
}
