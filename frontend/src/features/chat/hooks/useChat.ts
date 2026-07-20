import { useCallback, useEffect, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { conversationKeys } from '@/features/conversations/hooks/useConversations';
import type { ConversationWithMessages } from '@/features/conversations/types';
import { chatService } from '@/services/chatService';
import { conversationsService } from '@/services/conversationsService';
import { useStreamGuardStore } from '@/store/streamGuardStore';
import type { ChatStreamEvent, StreamState, ToolBlockState } from '../types';

export interface UsageLimit {
  resetIn: number;
  message: string;
}

interface UseChatResult {
  streamState: StreamState;
  pendingUserMessage: string | null;
  toolBlock: ToolBlockState | null;
  streamingContent: string;
  error: string | null;
  usageLimit: UsageLimit | null;
  isStreaming: boolean;
  /**
   * True from `send()` until the turn's persisted rows are in the cache. While
   * set, the caller must keep rendering the history it had at send time — the
   * backend persists the user message before streaming, so a history refetch
   * landing mid-turn would render it alongside `pendingUserMessage`.
   */
  isTurnActive: boolean;
  send: (message: string) => void;
  stop: () => void;
  dismissError: () => void;
  clearUsageLimit: () => void;
}

/**
 * Drives a single conversation's chat turn: opens the SSE stream, runs the
 * event state machine, buffers tokens in a ref (flushed ~60fps via rAF), and
 * refetches persisted messages when the turn completes.
 */
export function useChat(conversationId: string | undefined): UseChatResult {
  const queryClient = useQueryClient();
  const [streamState, setStreamState] = useState<StreamState>('IDLE');
  const [pendingUserMessage, setPendingUserMessage] = useState<string | null>(
    null,
  );
  const [toolBlock, setToolBlock] = useState<ToolBlockState | null>(null);
  const [streamingContent, setStreamingContent] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [usageLimit, setUsageLimit] = useState<UsageLimit | null>(null);
  const [isTurnActive, setIsTurnActive] = useState(false);

  const bufferRef = useRef('');
  const rafRef = useRef<number | null>(null);
  const messageIdRef = useRef<string | null>(null);
  const erroredRef = useRef(false);
  const abortRef = useRef<AbortController | null>(null);

  const flush = useCallback(() => {
    rafRef.current = null;
    setStreamingContent(bufferRef.current);
  }, []);

  const scheduleFlush = useCallback(() => {
    if (rafRef.current === null) {
      rafRef.current = requestAnimationFrame(flush);
    }
  }, [flush]);

  const cancelRaf = useCallback(() => {
    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
  }, []);

  /**
   * Drops the optimistic/live copy of the turn once the persisted rows are in
   * the cache. A failed tool block is kept: it is never persisted, so refetched
   * history cannot show it.
   */
  const resetLive = useCallback((keepToolBlock = false) => {
    bufferRef.current = '';
    setStreamingContent('');
    if (!keepToolBlock) setToolBlock(null);
    setPendingUserMessage(null);
    messageIdRef.current = null;
  }, []);

  const finalize = useCallback(async () => {
    cancelRaf();
    // Persisted user + tool + assistant rows now exist. Fetch them *outside*
    // the cache, then write the cache and drop the live state in the same tick
    // so React commits both together — writing the cache first would render one
    // frame with the persisted turn *and* the optimistic copy still on screen.
    const controller = abortRef.current;
    let persisted: ConversationWithMessages | null = null;
    if (conversationId) {
      try {
        persisted = await conversationsService.get(conversationId);
      } catch {
        // Fall back to a plain invalidate below.
      }
    }
    // The user switched conversations (or unmounted) while we were fetching —
    // that turn's state is gone, so don't resurrect it.
    if (controller?.signal.aborted) return;

    if (conversationId) {
      if (persisted) {
        queryClient.setQueryData(
          conversationKeys.detail(conversationId),
          persisted,
        );
      } else {
        void queryClient.invalidateQueries({
          queryKey: conversationKeys.detail(conversationId),
        });
      }
    }
    void queryClient.invalidateQueries({ queryKey: conversationKeys.all });
    // Released in the same commit as the live state below, so the frozen
    // history and the optimistic copy are swapped for the persisted rows
    // together — never one frame with both.
    setIsTurnActive(false);
    if (!erroredRef.current) {
      resetLive();
      setStreamState('IDLE');
    } else {
      // The backend persists whatever was streamed before the failure, so the
      // live text is now a duplicate of a real row — drop it, keep the failed
      // tool block, and re-enable input.
      resetLive(true);
      setStreamState('ERROR');
    }
  }, [cancelRaf, conversationId, queryClient, resetLive]);

  const handleEvent = useCallback(
    (event: ChatStreamEvent) => {
      switch (event.type) {
        case 'started':
          messageIdRef.current = event.messageId;
          break;
        case 'tool_start':
          setToolBlock({ status: 'loading' });
          setStreamState('STREAMING_TOOL');
          break;
        case 'tool_query':
          setToolBlock({ status: 'query', query: event.query });
          break;
        case 'tool_end':
          setToolBlock((prev) => ({
            status: 'complete',
            query: prev?.query,
            rowCount: event.rowCount,
          }));
          setStreamState('STREAMING_ANSWER');
          break;
        case 'token':
          bufferRef.current += event.content;
          setStreamState('STREAMING_ANSWER');
          scheduleFlush();
          break;
        case 'tool_error':
          erroredRef.current = true;
          setToolBlock((prev) => ({
            status: 'error',
            query: prev?.query,
            error: event.message,
          }));
          break;
        case 'error':
          // The backend has already persisted the partial turn and will not
          // send `done`, so finalise here instead.
          erroredRef.current = true;
          setError(event.message);
          void finalize();
          break;
        case 'done':
          void finalize();
          break;
      }
    },
    [finalize, scheduleFlush],
  );

  const send = useCallback(
    (message: string) => {
      if (!conversationId || !message.trim()) return;
      erroredRef.current = false;
      messageIdRef.current = null;
      bufferRef.current = '';
      setError(null);
      setStreamingContent('');
      setToolBlock(null);
      setPendingUserMessage(message);
      setStreamState('SENDING');
      setIsTurnActive(true);

      const controller = new AbortController();
      abortRef.current = controller;
      void chatService.streamChat(
        { conversationId, message },
        controller.signal,
        {
          onEvent: handleEvent,
          onError: (msg) => {
            erroredRef.current = true;
            setError(msg);
            setStreamState('ERROR');
            // The turn stays "active": the optimistic message is still on
            // screen and the backend may already have persisted its copy, so
            // the history must stay frozen until the next send or switch.
          },
          onLimit: (resetIn, msg) => {
            // The request was rejected before sending; drop the optimistic msg.
            setPendingUserMessage(null);
            setIsTurnActive(false);
            setUsageLimit({ resetIn, message: msg });
            setStreamState('IDLE');
          },
        },
      );
    },
    [conversationId, handleEvent],
  );

  const stop = useCallback(() => {
    const messageId = messageIdRef.current;
    if (!conversationId || !messageId) return;
    void chatService.stop(conversationId, messageId).catch(() => {
      // The stream still finalises via its `done` event; ignore stop errors.
    });
  }, [conversationId]);

  const dismissError = useCallback(() => setError(null), []);
  const clearUsageLimit = useCallback(() => setUsageLimit(null), []);

  // Reset everything when switching conversations or unmounting.
  useEffect(() => {
    return () => {
      abortRef.current?.abort();
      cancelRaf();
    };
  }, [cancelRaf]);

  useEffect(() => {
    abortRef.current?.abort();
    cancelRaf();
    bufferRef.current = '';
    erroredRef.current = false;
    messageIdRef.current = null;
    setStreamState('IDLE');
    setPendingUserMessage(null);
    setToolBlock(null);
    setStreamingContent('');
    setError(null);
    setUsageLimit(null);
    setIsTurnActive(false);
  }, [conversationId, cancelRaf]);

  const isStreaming =
    streamState === 'SENDING' ||
    streamState === 'STREAMING_TOOL' ||
    streamState === 'STREAMING_ANSWER';

  // Warn on tab close / reload while an answer is still streaming.
  useEffect(() => {
    if (!isStreaming) return;
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      // Legacy browsers require a non-empty returnValue; the text is ignored.
      e.returnValue = '';
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [isStreaming]);

  // Publish the streaming flag so the sidebar can confirm before navigating.
  const setGuardStreaming = useStreamGuardStore((s) => s.setStreaming);
  useEffect(() => {
    setGuardStreaming(isStreaming);
    return () => setGuardStreaming(false);
  }, [isStreaming, setGuardStreaming]);

  return {
    streamState,
    pendingUserMessage,
    toolBlock,
    streamingContent,
    error,
    usageLimit,
    isStreaming,
    isTurnActive,
    send,
    stop,
    dismissError,
    clearUsageLimit,
  };
}
