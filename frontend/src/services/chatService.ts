import { api, API_ORIGIN } from '@/services/api';
import { clearToken, getToken } from '@/utils/token';
import type { ChatStreamEvent } from '@/features/chat/types';

export interface StreamHandlers {
  onEvent: (event: ChatStreamEvent) => void;
  /** Called for transport/HTTP errors that happen before/around the stream. */
  onError: (message: string, status?: number) => void;
  /** Called on a 429, with seconds until the budget resets. */
  onLimit?: (resetIn: number, message: string) => void;
}

interface StopResponse {
  messageId: string;
  stopped: boolean;
  content: string;
}

/**
 * Opens the `POST /chat` SSE stream with `fetch` (EventSource cannot send the
 * Authorization header) and dispatches each parsed event. Resolves when the
 * stream closes. Aborting `signal` cancels the request silently.
 */
async function streamChat(
  body: { conversationId: string; message: string },
  signal: AbortSignal,
  { onEvent, onError, onLimit }: StreamHandlers,
): Promise<void> {
  let res: Response;
  try {
    res = await fetch(`${API_ORIGIN}/api/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${getToken() ?? ''}`,
      },
      body: JSON.stringify(body),
      signal,
    });
  } catch {
    if (!signal.aborted) onError('Network error. Please try again.');
    return;
  }

  if (res.status === 401) {
    clearToken();
    window.location.assign('/login');
    return;
  }

  if (res.status === 429) {
    const { message, resetIn } = await readLimitError(res);
    if (onLimit) onLimit(resetIn, message);
    else onError(message, 429);
    return;
  }

  if (!res.ok || !res.body) {
    onError(await readErrorMessage(res), res.status);
    return;
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      let boundary = buffer.indexOf('\n\n');
      while (boundary !== -1) {
        const raw = buffer.slice(0, boundary).trim();
        buffer = buffer.slice(boundary + 2);
        if (raw.startsWith('data:')) {
          const json = raw.slice(5).trim();
          try {
            onEvent(JSON.parse(json) as ChatStreamEvent);
          } catch {
            // Ignore malformed frames rather than tearing down the stream.
          }
        }
        boundary = buffer.indexOf('\n\n');
      }
    }
  } catch {
    if (!signal.aborted) onError('The connection was interrupted.');
  }
}

async function readLimitError(
  res: Response,
): Promise<{ message: string; resetIn: number }> {
  try {
    const body: unknown = await res.json();
    if (body && typeof body === 'object') {
      const record = body as { message?: unknown; resetIn?: unknown };
      return {
        message:
          typeof record.message === 'string'
            ? record.message
            : 'You have reached your hourly usage limit.',
        resetIn: typeof record.resetIn === 'number' ? record.resetIn : 3600,
      };
    }
  } catch {
    // fall through
  }
  return {
    message: 'You have reached your hourly usage limit.',
    resetIn: 3600,
  };
}

async function readErrorMessage(res: Response): Promise<string> {
  try {
    const body: unknown = await res.json();
    if (
      body &&
      typeof body === 'object' &&
      'message' in body &&
      typeof (body as { message: unknown }).message === 'string'
    ) {
      return (body as { message: string }).message;
    }
  } catch {
    // fall through
  }
  return 'Something went wrong. Please try again.';
}

export const chatService = {
  streamChat,
  async stop(conversationId: string, messageId: string): Promise<StopResponse> {
    const res = await api.post<StopResponse>('/chat/stop', {
      conversationId,
      messageId,
    });
    return res.data;
  },
};
