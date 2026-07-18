import { formatDistanceToNow } from 'date-fns';
import { Trash2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { cn } from '@/utils/cn';
import type { ConversationSummary } from '../types';

interface ConversationItemProps {
  conversation: ConversationSummary;
  isActive: boolean;
  onRequestDelete: (conversation: ConversationSummary) => void;
}

export function ConversationItem({
  conversation,
  isActive,
  onRequestDelete,
}: ConversationItemProps) {
  return (
    <Link
      to={`/chat/${conversation.id}`}
      data-testid="conversation-item"
      className={cn(
        'group flex items-center gap-2 rounded-md border-l-2 px-3 py-2 text-sm transition-colors',
        isActive
          ? 'border-primary bg-accent text-accent-foreground'
          : 'border-transparent hover:bg-accent/50',
      )}
    >
      <span className="min-w-0 flex-1">
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
