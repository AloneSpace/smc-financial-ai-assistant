import { useEffect, useRef, useState } from 'react';
import { Send, Square } from 'lucide-react';
import { cn } from '@/utils/cn';

interface ChatInputProps {
  onSend: (message: string) => void;
  onStop: () => void;
  isStreaming: boolean;
  /** Blocks input independently of streaming (e.g. usage limit reached). */
  disabled?: boolean;
  /** Changing this refocuses the textarea (e.g. on conversation switch). */
  focusKey?: string;
}

const MAX_HEIGHT = 200;

/**
 * Auto-expanding chat composer. Enter sends, Shift+Enter inserts a newline,
 * Cmd/Ctrl+Enter also sends. Shows a Stop button while a response streams.
 */
export function ChatInput({
  onSend,
  onStop,
  isStreaming,
  disabled = false,
  focusKey,
}: ChatInputProps) {
  const [value, setValue] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const inputBlocked = isStreaming || disabled;

  const resize = () => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, MAX_HEIGHT)}px`;
  };

  useEffect(resize, [value]);

  // Focus on mount and whenever the active conversation changes.
  useEffect(() => {
    textareaRef.current?.focus();
  }, [focusKey]);

  const submit = () => {
    const trimmed = value.trim();
    if (!trimmed || inputBlocked) return;
    onSend(trimmed);
    setValue('');
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // Enter sends; Shift+Enter inserts a newline; Cmd/Ctrl+Enter also sends.
    if (event.key === 'Enter' && (event.metaKey || event.ctrlKey)) {
      event.preventDefault();
      submit();
      return;
    }
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      submit();
    }
  };

  const canSend = value.trim().length > 0 && !inputBlocked;

  return (
    <div className="border-t border-border bg-background px-4 py-3">
      <div className="mx-auto flex w-full max-w-3xl items-end gap-2">
        <textarea
          ref={textareaRef}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={handleKeyDown}
          rows={1}
          disabled={inputBlocked}
          placeholder={
            disabled
              ? 'Usage limit reached — please wait…'
              : "Ask about a company's financials…"
          }
          className="flex-1 resize-none rounded-xl border bg-background px-4 py-2.5 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-60"
        />
        {isStreaming ? (
          <button
            type="button"
            onClick={onStop}
            aria-label="Stop generating"
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-border bg-background text-foreground transition-colors hover:bg-accent"
          >
            <Square className="h-4 w-4 fill-current" />
          </button>
        ) : (
          <button
            type="button"
            onClick={submit}
            disabled={!canSend}
            aria-label="Send message"
            className={cn(
              'flex h-11 w-11 shrink-0 items-center justify-center rounded-xl transition-colors',
              canSend
                ? 'bg-primary text-primary-foreground hover:bg-primary/90'
                : 'cursor-not-allowed bg-muted text-muted-foreground',
            )}
          >
            <Send className="h-4 w-4 text-white" />
          </button>
        )}
      </div>
    </div>
  );
}
