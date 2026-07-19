import { formatDistanceToNow } from 'date-fns';
import { Trash2 } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { cn } from '@/utils/cn';
import type { ConversationSummary } from '../types';

interface ConversationItemProps {
  conversation: ConversationSummary;
  isActive: boolean;
  onRequestDelete: (conversation: ConversationSummary) => void;
  onRename: (id: string, title: string) => void;
  /** Called when the conversation link is followed (closes the mobile drawer). */
  onNavigate?: () => void;
  /** Return true to block the link and handle navigation to `to` yourself. */
  onIntercept?: (to: string) => boolean;
}

export function ConversationItem({
  conversation,
  isActive,
  onRequestDelete,
  onRename,
  onNavigate,
  onIntercept,
}: ConversationItemProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [draft, setDraft] = useState(conversation.title);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isEditing) {
      inputRef.current?.focus();
      inputRef.current?.select();
    }
  }, [isEditing]);

  const startEditing = () => {
    setDraft(conversation.title);
    setIsEditing(true);
  };

  const commit = () => {
    const next = draft.trim();
    if (next && next !== conversation.title) {
      onRename(conversation.id, next);
    }
    setIsEditing(false);
  };

  const cancel = () => {
    setDraft(conversation.title);
    setIsEditing(false);
  };

  if (isEditing) {
    return (
      <div
        className={cn(
          'flex items-center gap-2 rounded-md border-l-2 px-3 py-2 text-sm',
          isActive ? 'border-primary bg-accent' : 'border-transparent',
        )}
      >
        <input
          ref={inputRef}
          value={draft}
          maxLength={255}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={commit}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              commit();
            } else if (e.key === 'Escape') {
              e.preventDefault();
              cancel();
            }
          }}
          className="min-w-0 flex-1 rounded-sm bg-background px-1.5 py-0.5 text-sm font-medium outline-none ring-1 ring-primary/40 focus:ring-2 focus:ring-primary"
          aria-label="Conversation title"
        />
      </div>
    );
  }

  const to = `/chat/${conversation.id}`;

  return (
    <Link
      to={to}
      data-testid="conversation-item"
      onClick={(e) => {
        if (onIntercept?.(to)) {
          e.preventDefault();
          return;
        }
        onNavigate?.();
      }}
      className={cn(
        'group flex items-center gap-2 rounded-md border-l-2 px-3 py-2 text-sm transition-colors',
        isActive
          ? 'border-primary bg-accent text-accent-foreground'
          : 'border-transparent hover:bg-accent/50',
      )}
    >
      <span
        className="min-w-0 flex-1"
        onDoubleClick={(e) => {
          e.preventDefault();
          startEditing();
        }}
        title="Double-click to rename"
      >
        <span className="block truncate font-medium">{conversation.title}</span>
        <span className="block text-xs text-muted-foreground">
          {formatDistanceToNow(new Date(conversation.updatedAt), { addSuffix: true })}
        </span>
      </span>
      <button
        type="button"
        aria-label="Delete conversation"
        className="shrink-0 rounded p-1 text-muted-foreground opacity-0 transition-opacity hover:text-destructive focus:opacity-100 group-hover:opacity-100"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          onRequestDelete(conversation);
        }}
      >
        <Trash2 className="h-4 w-4" />
      </button>
    </Link>
  );
}
