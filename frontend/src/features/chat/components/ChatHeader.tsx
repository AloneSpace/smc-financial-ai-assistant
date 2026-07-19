import { Menu, Share2 } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { useRenameConversation } from '@/features/conversations/hooks/useConversations';

interface ChatHeaderProps {
  /** Conversation title, or undefined for an unsaved new chat. */
  title?: string;
  /** Present once the conversation is saved; enables Share and rename. */
  conversationId?: string;
  onOpenSidebar: () => void;
}

/** Top bar of the chat pane: drawer toggle + conversation name (left),
 *  Share (right). Double-click the name to rename the conversation. */
export function ChatHeader({
  title,
  conversationId,
  onOpenSidebar,
}: ChatHeaderProps) {
  const renameConversation = useRenameConversation();
  const [isEditing, setIsEditing] = useState(false);
  const [draft, setDraft] = useState(title ?? '');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isEditing) {
      inputRef.current?.focus();
      inputRef.current?.select();
    }
  }, [isEditing]);

  const startEditing = () => {
    if (!conversationId) return;
    setDraft(title ?? '');
    setIsEditing(true);
  };

  const commit = async () => {
    setIsEditing(false);
    const next = draft.trim();
    if (!conversationId || !next || next === title) return;
    await renameConversation.mutateAsync({ id: conversationId, title: next });
    toast.success(`Renamed to “${next}”`);
  };

  const cancel = () => {
    setDraft(title ?? '');
    setIsEditing(false);
  };

  const handleShare = async () => {
    if (!conversationId) return;
    try {
      await navigator.clipboard.writeText(window.location.href);
      toast.success('Chat link copied to clipboard');
    } catch {
      toast.error('Couldn’t copy the link');
    }
  };

  return (
    <header className="flex items-center gap-2 border-b px-3 py-2">
      <Button
        variant="ghost"
        size="icon"
        aria-label="Open conversations"
        className="shrink-0 md:hidden"
        onClick={onOpenSidebar}
      >
        <Menu className="h-5 w-5" />
      </Button>

      {isEditing ? (
        <input
          ref={inputRef}
          value={draft}
          maxLength={255}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={commit}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              void commit();
            } else if (e.key === 'Escape') {
              e.preventDefault();
              cancel();
            }
          }}
          className="min-w-0 flex-1 rounded-sm bg-background px-1.5 py-0.5 text-sm font-medium outline-none ring-1 ring-primary/40 focus:ring-2 focus:ring-primary"
          aria-label="Conversation title"
        />
      ) : (
        <h1
          className="min-w-0 flex-1 cursor-text truncate text-sm font-medium"
          onDoubleClick={startEditing}
          title={conversationId ? 'Double-click to rename' : undefined}
        >
          {title ?? 'New chat'}
        </h1>
      )}

      <Button
        variant="outline"
        size="sm"
        className="shrink-0 gap-2"
        onClick={handleShare}
        disabled={!conversationId}
      >
        <Share2 className="h-4 w-4" />
        <span className="hidden sm:inline">Share</span>
      </Button>
    </header>
  );
}
