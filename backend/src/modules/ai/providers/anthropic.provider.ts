import { Logger } from '@nestjs/common';
import Anthropic from '@anthropic-ai/sdk';
import type {
  MessageParam,
  Tool,
  ToolResultBlockParam,
} from '@anthropic-ai/sdk/resources/messages';
import {
  AiProvider,
  AiStreamParams,
  AiStreamResult,
} from '../ai-provider.interface';
import { estimateCostUsd } from '../pricing.util';

/** Safety cap on tool-call rounds to prevent a runaway agentic loop. */
const MAX_TOOL_ROUNDS = 5;
/** Upper bound on generated tokens per turn (Anthropic requires this). */
const MAX_OUTPUT_TOKENS = 1024;

/**
 * Anthropic implementation of {@link AiProvider} using the Messages API with
 * tool use and native token streaming.
 */
export class AnthropicProvider implements AiProvider {
  readonly name = 'anthropic' as const;
  private readonly logger = new Logger(AnthropicProvider.name);

  constructor(
    private readonly client: Anthropic,
    private readonly model: string,
  ) {}

  async streamChat(params: AiStreamParams): Promise<AiStreamResult> {
    const { system, messages, tool, executeSql, onEvent, signal } = params;

    const conversation: MessageParam[] = messages.map((m) => ({
      role: m.role,
      content: m.content,
    }));

    const tools: Tool[] = [
      {
        name: tool.name,
        description: tool.description,
        input_schema: tool.inputSchema as Tool.InputSchema,
      },
    ];

    let content = '';
    let promptTokens = 0;
    let completionTokens = 0;

    for (let round = 0; round < MAX_TOOL_ROUNDS; round++) {
      const stream = this.client.messages.stream(
        {
          model: this.model,
          max_tokens: MAX_OUTPUT_TOKENS,
          system,
          messages: conversation,
          tools,
        },
        { signal },
      );

      try {
        for await (const event of stream) {
          if (
            event.type === 'content_block_delta' &&
            event.delta.type === 'text_delta'
          ) {
            content += event.delta.text;
            onEvent({ type: 'token', content: event.delta.text });
          }
        }
      } catch (err) {
        if (signal.aborted) break;
        throw err;
      }

      const final = await stream.finalMessage();
      promptTokens += final.usage.input_tokens;
      completionTokens += final.usage.output_tokens;

      if (final.stop_reason !== 'tool_use') {
        break; // Model produced its final answer.
      }

      // Echo the assistant's tool-use turn back into the conversation.
      conversation.push({ role: 'assistant', content: final.content });

      const toolResults: ToolResultBlockParam[] = [];
      let toolFailed = false;
      for (const block of final.content) {
        if (block.type !== 'tool_use') continue;
        onEvent({ type: 'tool_start' });
        const query = this.extractQuery(block.input);
        onEvent({ type: 'tool_query', query });
        try {
          const result = await executeSql(query);
          onEvent({ type: 'tool_end', rowCount: result.rowCount });
          toolResults.push({
            type: 'tool_result',
            tool_use_id: block.id,
            content: JSON.stringify(result.rows),
          });
        } catch (err) {
          onEvent({
            type: 'tool_error',
            message: err instanceof Error ? err.message : String(err),
          });
          toolFailed = true;
          break;
        }
      }
      if (toolFailed) break;

      conversation.push({ role: 'user', content: toolResults });
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

  /** Extracts the `query` field from a tool_use input object. */
  private extractQuery(input: unknown): string {
    if (
      input &&
      typeof input === 'object' &&
      'query' in input &&
      typeof (input as { query: unknown }).query === 'string'
    ) {
      return (input as { query: string }).query;
    }
    this.logger.warn('tool_use input missing string `query` field');
    return '';
  }
}
