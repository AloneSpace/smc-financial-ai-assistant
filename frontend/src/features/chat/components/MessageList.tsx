import { useEffect, useRef, useState } from 'react';
import { ArrowDown } from 'lucide-react';
import type { Message } from '@/features/conversations/types';
import type { StreamState, ToolBlockState } from '../types';
import { MessageBubble } from './MessageBubble';
import { SqlToolBlock } from './SqlToolBlock';

interface MessageListProps {
  messages: Message[];
  pendingUserMessage: string | null;
  toolBlock: ToolBlockState | null;
  streamingContent: string;
  streamState: StreamState;
}

const SCROLL_THRESHOLD = 80;

/** Reconstructs a persisted `tool` row into a completed SqlToolBlock. */
function toolStateFromMessage(message: Message): ToolBlockState {
  const query =
    message.toolInput && typeof message.toolInput.query === 'string'
      ? message.toolInput.query
      : undefined;
  return {
    status: 'complete',
    query,
    rowCount: message.toolOutput?.length ?? 0,
  };
}

/**
 * Renders the full turn list (persisted + live streaming) with auto-scroll that
 * suspends when the user scrolls up, plus a "jump to latest" affordance.
 */
export function MessageList({
  messages,
  pendingUserMessage,
  toolBlock,
  streamingContent,
  streamState,
}: MessageListProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [pinned, setPinned] = useState(true);

  const handleScroll = () => {
    const el = containerRef.current;
    if (!el) return;
    const distance = el.scrollHeight - el.scrollTop - el.clientHeight;
    setPinned(distance < SCROLL_THRESHOLD);
  };

  // Auto-scroll to the newest content only while the user is pinned to bottom.
  useEffect(() => {
    if (!pinned) return;
    const el = containerRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  });

  const showThinking = streamState === 'SENDING';
  const showLiveAnswer =
    streamState === 'STREAMING_ANSWER' || streamingContent.length > 0;

  return (
    <div className="relative flex-1 overflow-hidden">
      <div
        ref={containerRef}
        onScroll={handleScroll}
        className="h-full overflow-y-auto"
      >
        <div className="mx-auto flex w-full max-w-3xl flex-col gap-4 p-4">
          {messages.map((message) => {
            if (message.role === 'tool') {
              return (
                <SqlToolBlock
                  key={message.id}
                  state={toolStateFromMessage(message)}
                />
              );
            }
            return (
              <MessageBubble
                key={message.id}
                role={message.role === 'user' ? 'user' : 'assistant'}
                content={message.content}
                isPartial={message.isPartial}
              />
            );
          })}

          {pendingUserMessage !== null ? (
            <MessageBubble role="user" content={pendingUserMessage} />
          ) : null}

          {toolBlock ? <SqlToolBlock state={toolBlock} /> : null}

          {showThinking ? (
            <div className="flex justify-start">
              <div className="flex gap-1 rounded-2xl rounded-bl-sm border border-border bg-card px-4 py-3">
                <Dot delay="0ms" />
                <Dot delay="150ms" />
                <Dot delay="300ms" />
              </div>
            </div>
          ) : null}

          {showLiveAnswer ? (
            <MessageBubble
              role="assistant"
              content={streamingContent}
              isStreaming
            />
          ) : null}
        </div>
      </div>

      {!pinned ? (
        <button
          type="button"
          onClick={() => {
            const el = containerRef.current;
            if (el) el.scrollTop = el.scrollHeight;
            setPinned(true);
          }}
          className="absolute bottom-4 left-1/2 flex h-9 w-9 -translate-x-1/2 items-center justify-center rounded-full border border-border bg-background shadow-md transition-colors hover:bg-accent"
          aria-label="Scroll to latest"
        >
          <ArrowDown className="h-4 w-4" />
        </button>
      ) : null}
    </div>
  );
}

function Dot({ delay }: { delay: string }) {
  return (
    <span
      className="h-2 w-2 animate-bounce rounded-full bg-muted-foreground/60"
      style={{ animationDelay: delay }}
    />
  );
}
