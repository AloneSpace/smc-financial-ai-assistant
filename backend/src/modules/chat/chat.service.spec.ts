import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { Repository } from 'typeorm';
import type { Response } from 'express';
import { Conversation } from '../conversations/entities/conversation.entity';
import { Message } from '../conversations/entities/message.entity';
import { AiService } from '../ai/ai.service';
import { AiStreamParams, AiStreamResult } from '../ai/ai-provider.interface';
import { UsageService } from '../usage/usage.service';
import { SqlToolService } from './sql-tool.service';
import { ChatService } from './chat.service';

/** Minimal Response double that records SSE writes and header state. */
function fakeResponse(): Response & { events: unknown[]; ended: boolean } {
  const events: unknown[] = [];
  const res = {
    events,
    ended: false,
    setHeader: jest.fn(),
    flushHeaders: jest.fn(),
    write: jest.fn((chunk: string) => {
      const json = chunk.replace(/^data: /, '').trim();
      events.push(JSON.parse(json));
      return true;
    }),
    end: jest.fn(function (this: { ended: boolean }) {
      this.ended = true;
    }),
  };
  return res as unknown as Response & { events: unknown[]; ended: boolean };
}

describe('ChatService', () => {
  let service: ChatService;
  let conversations: jest.Mocked<
    Pick<Repository<Conversation>, 'findOne' | 'save'>
  >;
  let messages: jest.Mocked<
    Pick<Repository<Message>, 'find' | 'save' | 'create'>
  >;
  let aiService: jest.Mocked<Pick<AiService, 'assertReady' | 'streamChat'>> & {
    maxHistoryMessages: number;
  };
  let sqlToolService: jest.Mocked<Pick<SqlToolService, 'execute'>>;
  let usageService: jest.Mocked<Pick<UsageService, 'track'>>;

  const conversation: Conversation = {
    id: 'conv-1',
    userId: 'user-1',
    title: 'New Conversation',
    createdAt: new Date(),
    updatedAt: new Date(),
    messages: [],
  };

  beforeEach(() => {
    conversations = {
      findOne: jest.fn().mockResolvedValue({ ...conversation }),
      save: jest.fn().mockImplementation((c) => Promise.resolve(c)),
    };
    messages = {
      find: jest.fn().mockResolvedValue([]),
      create: jest.fn().mockImplementation((m) => m),
      save: jest.fn().mockImplementation((m) => Promise.resolve(m)),
    };
    aiService = {
      assertReady: jest.fn(),
      streamChat: jest.fn(),
      maxHistoryMessages: 20,
    };
    sqlToolService = { execute: jest.fn() };
    usageService = { track: jest.fn().mockResolvedValue(undefined) };

    // The stop grace period is read at construction; disable it so these tests
    // don't wait 5s. Its own behaviour is covered separately below.
    process.env.CHAT_STOP_GRACE_PERIOD_MS = '0';
    service = new ChatService(
      conversations as unknown as Repository<Conversation>,
      messages as unknown as Repository<Message>,
      aiService as unknown as AiService,
      sqlToolService as unknown as SqlToolService,
      usageService as unknown as UsageService,
    );
  });

  it('streams started → done and persists user + assistant messages', async () => {
    const result: AiStreamResult = {
      content: 'Apple net income was **$96.99 billion**.',
      usage: {
        promptTokens: 100,
        completionTokens: 20,
        totalTokens: 120,
        estimatedCostUsd: 0.001,
      },
    };
    aiService.streamChat.mockImplementation(async (p: AiStreamParams) => {
      p.onEvent({ type: 'token', content: 'Apple ' });
      return result;
    });

    const res = fakeResponse();
    await service.orchestrateStream(
      'user-1',
      { conversationId: 'conv-1', message: 'Apple net income 2023?' },
      res,
    );

    const types = res.events.map((e) => (e as { type: string }).type);
    expect(types[0]).toBe('started');
    expect(types).toContain('token');
    expect(types[types.length - 1]).toBe('done');
    expect(res.ended).toBe(true);

    // user message + assistant message both saved
    const savedRoles = messages.save.mock.calls.map(
      (c) => (c[0] as Message).role,
    );
    expect(savedRoles).toContain('user');
    expect(savedRoles).toContain('assistant');
  });

  it('sets the conversation title from the first user message', async () => {
    aiService.streamChat.mockResolvedValue({
      content: 'ok',
      usage: {
        promptTokens: 1,
        completionTokens: 1,
        totalTokens: 2,
        estimatedCostUsd: 0,
      },
    });
    const res = fakeResponse();
    await service.orchestrateStream(
      'user-1',
      { conversationId: 'conv-1', message: 'What was Tesla revenue in 2024?' },
      res,
    );
    const savedConv = conversations.save.mock.calls[0][0] as Conversation;
    expect(savedConv.title).toBe('What was Tesla revenue in 2024?');
  });

  it('throws NotFound (before any header) for a missing conversation', async () => {
    conversations.findOne.mockResolvedValue(null);
    const res = fakeResponse();
    await expect(
      service.orchestrateStream(
        'user-1',
        { conversationId: 'conv-1', message: 'hi' },
        res,
      ),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(res.flushHeaders).not.toHaveBeenCalled();
    expect(aiService.streamChat).not.toHaveBeenCalled();
  });

  it('throws Forbidden for a conversation owned by another user', async () => {
    conversations.findOne.mockResolvedValue({
      ...conversation,
      userId: 'someone-else',
    });
    const res = fakeResponse();
    await expect(
      service.orchestrateStream(
        'user-1',
        { conversationId: 'conv-1', message: 'hi' },
        res,
      ),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('emits an error event when the AI call fails mid-stream', async () => {
    aiService.streamChat.mockRejectedValue(new Error('upstream 500'));
    const res = fakeResponse();
    await service.orchestrateStream(
      'user-1',
      { conversationId: 'conv-1', message: 'hi' },
      res,
    );
    const types = res.events.map((e) => (e as { type: string }).type);
    expect(types).toContain('error');
    expect(res.ended).toBe(true);
  });

  it('aborts an active stream and returns its partial content', async () => {
    let captured: AiStreamParams | undefined;
    aiService.streamChat.mockImplementation((p: AiStreamParams) => {
      captured = p;
      p.onEvent({ type: 'token', content: 'partial answer' });
      return new Promise<AiStreamResult>((resolve) => {
        p.signal.addEventListener('abort', () =>
          resolve({ content: 'partial answer', usage: EMPTY }),
        );
      });
    });
    const EMPTY = {
      promptTokens: 0,
      completionTokens: 0,
      totalTokens: 0,
      estimatedCostUsd: 0,
    };

    const res = fakeResponse();
    const streamPromise = service.orchestrateStream(
      'user-1',
      { conversationId: 'conv-1', message: 'hi' },
      res,
    );

    // Wait a tick for the started event carrying the messageId.
    await new Promise((r) => setImmediate(r));
    const started = res.events.find(
      (e) => (e as { type: string }).type === 'started',
    ) as { messageId: string };

    const stopResult = service.stopStream('user-1', {
      conversationId: 'conv-1',
      messageId: started.messageId,
    });
    expect(stopResult.stopped).toBe(true);
    expect(stopResult.content).toBe('partial answer');
    expect(captured?.signal.aborted).toBe(true);

    await streamPromise;
    const done = res.events.find(
      (e) => (e as { type: string }).type === 'done',
    ) as { isPartial: boolean };
    expect(done.isPartial).toBe(true);
  });

  it('finalises as a partial stop (not an error) when the AI call throws on abort', async () => {
    // The SDK throws rather than resolving when aborted while the upstream
    // request is still opening — that must not surface as "AI service error".
    aiService.streamChat.mockImplementation((p: AiStreamParams) => {
      return new Promise<AiStreamResult>((_resolve, reject) => {
        p.signal.addEventListener('abort', () =>
          reject(new Error('The operation was aborted')),
        );
      });
    });

    const res = fakeResponse();
    const streamPromise = service.orchestrateStream(
      'user-1',
      { conversationId: 'conv-1', message: 'hi' },
      res,
    );
    await new Promise((r) => setImmediate(r));
    const started = res.events.find(
      (e) => (e as { type: string }).type === 'started',
    ) as { messageId: string };
    service.stopStream('user-1', {
      conversationId: 'conv-1',
      messageId: started.messageId,
    });
    await streamPromise;

    const types = res.events.map((e) => (e as { type: string }).type);
    expect(types).not.toContain('error');
    const done = res.events.find(
      (e) => (e as { type: string }).type === 'done',
    ) as { isPartial: boolean };
    expect(done.isPartial).toBe(true);
  });

  it('never calls the provider when stopped during the grace period', async () => {
    process.env.CHAT_STOP_GRACE_PERIOD_MS = '2000';
    const delayed = new ChatService(
      conversations as unknown as Repository<Conversation>,
      messages as unknown as Repository<Message>,
      aiService as unknown as AiService,
      sqlToolService as unknown as SqlToolService,
      usageService as unknown as UsageService,
    );

    const res = fakeResponse();
    const streamPromise = delayed.orchestrateStream(
      'user-1',
      { conversationId: 'conv-1', message: 'hi' },
      res,
    );
    await new Promise((r) => setImmediate(r));
    const started = res.events.find(
      (e) => (e as { type: string }).type === 'started',
    ) as { messageId: string };
    // Still inside the grace window — no upstream call has happened yet.
    expect(aiService.streamChat).not.toHaveBeenCalled();

    delayed.stopStream('user-1', {
      conversationId: 'conv-1',
      messageId: started.messageId,
    });
    await streamPromise;

    expect(aiService.streamChat).not.toHaveBeenCalled();
    const types = res.events.map((e) => (e as { type: string }).type);
    expect(types).not.toContain('error');
    expect(types[types.length - 1]).toBe('done');
  });

  it('rejects stopping an unknown stream with NotFound', () => {
    expect(() =>
      service.stopStream('user-1', {
        conversationId: 'conv-1',
        messageId: 'missing',
      }),
    ).toThrow(NotFoundException);
  });
});
