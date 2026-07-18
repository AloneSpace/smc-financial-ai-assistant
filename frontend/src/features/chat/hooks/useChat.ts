import { useCallback, useEffect, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { conversationKeys } from '@/features/conversations/hooks/useConversations';
import { chatApi } from '../api/chat.api';
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

  const resetLive = useCallback(() => {
    bufferRef.current = '';
    setStreamingContent('');
    setToolBlock(null);
    setPendingUserMessage(null);
    messageIdRef.current = null;
  }, []);

  const finalize = useCallback(async () => {
    cancelRaf();
    // Persisted user + tool + assistant rows now exist; refetch, then drop the
    // optimistic/live state so nothing renders twice.
    if (conversationId) {
      await queryClient.invalidateQueries({
        queryKey: conversationKeys.detail(conversationId),
      });
    }
    await queryClient.invalidateQueries({ queryKey: conversationKeys.all });
    if (!erroredRef.current) {
      resetLive();
      setStreamState('IDLE');
    } else {
      // Keep the failed tool block / partial text visible; re-enable input.
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
          erroredRef.current = true;
          setError(event.message);
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

      const controller = new AbortController();
      abortRef.current = controller;
      void chatApi.streamChat(
        { conversationId, message },
        controller.signal,
        {
          onEvent: handleEvent,
          onError: (msg) => {
            erroredRef.current = true;
            setError(msg);
            setStreamState('ERROR');
          },
          onLimit: (resetIn, msg) => {
            // The request was rejected before sending; drop the optimistic msg.
            setPendingUserMessage(null);
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
    void chatApi.stop(conversationId, messageId).catch(() => {
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
  }, [conversationId, cancelRaf]);

  const isStreaming =
    streamState === 'SENDING' ||
    streamState === 'STREAMING_TOOL' ||
    streamState === 'STREAMING_ANSWER';

  return {
    streamState,
    pendingUserMessage,
    toolBlock,
    streamingContent,
    error,
    usageLimit,
    isStreaming,
    send,
    stop,
    dismissError,
    clearUsageLimit,
  };
}
