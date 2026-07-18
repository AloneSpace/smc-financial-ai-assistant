import { randomUUID } from 'crypto';
import {
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import type { Response } from 'express';
import { Conversation } from '../conversations/entities/conversation.entity';
import { Message } from '../conversations/entities/message.entity';
import { generateConversationTitle } from '../conversations/conversation-title.util';
import { AiService } from '../ai/ai.service';
import {
  AiChatMessage,
  AiStreamEvent,
  AiStreamResult,
  AiUsage,
} from '../ai/ai-provider.interface';
import { UsageService } from '../usage/usage.service';
import { SqlToolService } from './sql-tool.service';
import { SYSTEM_PROMPT } from './constants/system-prompt.constant';
import { EXECUTE_SQL_TOOL } from './constants/execute-sql-tool.constant';
import {
  ChatStreamEvent,
  StopStreamResult,
} from './chat-stream-event.types';
import { SendMessageDto } from './dto/send-message.dto';
import { StopStreamDto } from './dto/stop-stream.dto';

/** Bookkeeping for a stream currently in flight, keyed by assistant messageId. */
interface ActiveStream {
  controller: AbortController;
  userId: string;
  conversationId: string;
  getContent: () => string;
}

const EMPTY_USAGE: AiUsage = {
  promptTokens: 0,
  completionTokens: 0,
  totalTokens: 0,
  estimatedCostUsd: 0,
};

/**
 * Orchestrates a chat turn end-to-end: ownership checks, message persistence,
 * the AI tool loop, SSE streaming, and stop/partial handling.
 */
@Injectable()
export class ChatService {
  private readonly logger = new Logger(ChatService.name);
  private readonly activeStreams = new Map<string, ActiveStream>();

  constructor(
    @InjectRepository(Conversation)
    private readonly conversations: Repository<Conversation>,
    @InjectRepository(Message)
    private readonly messages: Repository<Message>,
    private readonly aiService: AiService,
    private readonly sqlToolService: SqlToolService,
    private readonly usageService: UsageService,
  ) {}

  /**
   * Streams the AI response for a user message over SSE. Ownership/config
   * failures throw BEFORE any header is written so Nest returns clean JSON;
   * failures after the stream opens are emitted as `error`/`tool_error` events.
   */
  async orchestrateStream(
    userId: string,
    dto: SendMessageDto,
    res: Response,
  ): Promise<void> {
    const conversation = await this.getOwnedConversation(
      userId,
      dto.conversationId,
    );
    // Fail fast (clean 503) if the provider key is missing/placeholder.
    this.aiService.assertReady();

    await this.persistUserMessage(conversation, dto.message);

    const messageId = randomUUID();
    const controller = new AbortController();
    let liveContent = '';
    this.activeStreams.set(messageId, {
      controller,
      userId,
      conversationId: conversation.id,
      getContent: () => liveContent,
    });

    this.initSse(res);
    this.send(res, { type: 'started', messageId });

    const history = await this.buildHistory(conversation.id);
    const toolInvocations: {
      query: string;
      output: Record<string, unknown>[];
    }[] = [];

    const executeSql = async (query: string) => {
      const result = await this.sqlToolService.execute(query);
      toolInvocations.push({ query, output: result.rows });
      return result;
    };

    const onEvent = (event: AiStreamEvent): void => {
      if (event.type === 'token') liveContent += event.content;
      this.send(res, event);
    };

    try {
      const result = await this.aiService.streamChat({
        system: SYSTEM_PROMPT,
        messages: history,
        tool: EXECUTE_SQL_TOOL,
        executeSql,
        onEvent,
        signal: controller.signal,
      });
      const isPartial = controller.signal.aborted;
      await this.persistResult(
        conversation.id,
        messageId,
        toolInvocations,
        result,
        isPartial,
      );
      // Deduct spend for both full and stopped (partial) responses.
      await this.usageService.track(userId, result.usage.estimatedCostUsd);
      this.send(res, { type: 'done', usage: result.usage, isPartial });
    } catch (err) {
      this.logger.error(
        `Chat stream failed: ${err instanceof Error ? err.message : String(err)}`,
      );
      await this.persistResult(
        conversation.id,
        messageId,
        toolInvocations,
        { content: liveContent, usage: EMPTY_USAGE },
        false,
      );
      this.send(res, {
        type: 'error',
        message: 'AI service error. Please try again.',
      });
    } finally {
      this.activeStreams.delete(messageId);
      res.end();
    }
  }

  /**
   * Aborts an in-flight stream and returns the partial content saved so far.
   * The stream's own orchestration finalises persistence with isPartial=true.
   */
  stopStream(userId: string, dto: StopStreamDto): StopStreamResult {
    const active = this.activeStreams.get(dto.messageId);
    if (!active) {
      throw new NotFoundException('No active stream found');
    }
    if (
      active.userId !== userId ||
      active.conversationId !== dto.conversationId
    ) {
      throw new ForbiddenException();
    }
    active.controller.abort();
    return {
      messageId: dto.messageId,
      stopped: true,
      content: active.getContent(),
    };
  }

  private async getOwnedConversation(
    userId: string,
    id: string,
  ): Promise<Conversation> {
    const conversation = await this.conversations.findOne({ where: { id } });
    if (!conversation) {
      throw new NotFoundException('Conversation not found');
    }
    if (conversation.userId !== userId) {
      throw new ForbiddenException();
    }
    return conversation;
  }

  private async persistUserMessage(
    conversation: Conversation,
    message: string,
  ): Promise<void> {
    await this.messages.save(
      this.messages.create({
        conversationId: conversation.id,
        role: 'user',
        content: message,
      }),
    );
    // Title is derived from the first user message; bump updatedAt regardless.
    if (conversation.title === 'New Conversation') {
      conversation.title = generateConversationTitle(message);
    }
    await this.conversations.save(conversation);
  }

  /** Loads the recent user/assistant turns to send to the model as context. */
  private async buildHistory(
    conversationId: string,
  ): Promise<AiChatMessage[]> {
    const rows = await this.messages.find({
      where: { conversationId },
      order: { createdAt: 'ASC' },
    });
    const turns = rows
      .filter((m) => m.role === 'user' || m.role === 'assistant')
      .filter((m) => m.content.length > 0)
      .map((m) => ({ role: m.role as 'user' | 'assistant', content: m.content }));

    const capped = turns.slice(-this.aiService.maxHistoryMessages);
    // Anthropic requires the first message to be from the user.
    while (capped.length > 0 && capped[0].role === 'assistant') {
      capped.shift();
    }
    return capped;
  }

  private async persistResult(
    conversationId: string,
    messageId: string,
    toolInvocations: { query: string; output: Record<string, unknown>[] }[],
    result: AiStreamResult,
    isPartial: boolean,
  ): Promise<void> {
    // Tool rows are saved before the assistant row so createdAt ordering is
    // user → tool → assistant (matches the API contract).
    for (const invocation of toolInvocations) {
      await this.messages.save(
        this.messages.create({
          conversationId,
          role: 'tool',
          content: JSON.stringify(invocation.output),
          toolName: EXECUTE_SQL_TOOL.name,
          toolInput: { query: invocation.query },
          toolOutput: invocation.output,
        }),
      );
    }
    await this.messages.save(
      this.messages.create({
        id: messageId,
        conversationId,
        role: 'assistant',
        content: result.content,
        tokensUsed: result.usage.totalTokens || null,
        isPartial,
      }),
    );
  }

  private initSse(res: Response): void {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');
    res.flushHeaders();
  }

  private send(res: Response, event: ChatStreamEvent): void {
    res.write(`data: ${JSON.stringify(event)}\n\n`);
  }
}
