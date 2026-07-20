import { cn } from '@/utils/cn';
import { MarkdownRenderer } from './MarkdownRenderer';
import { StreamingIndicator } from './StreamingIndicator';

interface MessageBubbleProps {
  role: 'user' | 'assistant';
  content: string;
  isPartial?: boolean;
  isStreaming?: boolean;
}

/** A single chat turn: user (right, primary) or assistant (left, card). */
export function MessageBubble({
  role,
  content,
  isPartial = false,
  isStreaming = false,
}: MessageBubbleProps) {
  if (role === 'user') {
    return (
      <div className="flex justify-end">
        <div
          data-testid="user-message"
          className="max-w-[80%] whitespace-pre-wrap break-words rounded-2xl rounded-br-sm bg-primary px-4 py-2 text-sm text-white"
        >
          {content}
        </div>
      </div>
    );
  }

  return (
    <div className="flex justify-start">
      <div
        data-testid="assistant-message"
        className={cn(
          'max-w-[85%] break-words rounded-2xl rounded-bl-sm border border-border bg-card px-4 py-2 text-card-foreground',
        )}
      >
        <MarkdownRenderer content={content} />
        {isStreaming ? <StreamingIndicator /> : null}
        {isPartial ? (
          <p className="mt-2 border-t border-border/60 pt-1 text-xs italic text-muted-foreground">
            Generation was stopped.
          </p>
        ) : null}
      </div>
    </div>
  );
}
