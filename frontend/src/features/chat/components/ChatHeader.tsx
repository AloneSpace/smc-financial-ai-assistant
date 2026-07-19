import { Menu, MoreVertical, Pencil, Share2, Trash2 } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { DeleteConfirmationDialog } from '@/features/conversations/components/DeleteConfirmationDialog';
import { RenameDialog } from '@/features/conversations/components/RenameDialog';
import {
  useDeleteConversation,
  useRenameConversation,
} from '@/features/conversations/hooks/useConversations';

interface ChatHeaderProps {
  /** Conversation title, or undefined for an unsaved new chat. */
  title?: string;
  /** Present once the conversation is saved; enables Share, rename, delete. */
  conversationId?: string;
  onOpenSidebar: () => void;
}

/** Top bar of the chat pane: drawer toggle + conversation name (left), then
 *  Share on desktop and a kebab menu (rename / share / delete) on mobile.
 *  Double-click the name to rename inline on desktop. */
export function ChatHeader({
  title,
  conversationId,
  onOpenSidebar,
}: ChatHeaderProps) {
  const navigate = useNavigate();
  const renameConversation = useRenameConversation();
  const deleteConversation = useDeleteConversation();

  const [isEditing, setIsEditing] = useState(false);
  const [draft, setDraft] = useState(title ?? '');
  const [renameOpen, setRenameOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
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

  const handleRenameSave = async (next: string) => {
    if (!conversationId) return;
    await renameConversation.mutateAsync({ id: conversationId, title: next });
    setRenameOpen(false);
    toast.success(`Renamed to “${next}”`);
  };

  const handleConfirmDelete = async () => {
    if (!conversationId) return;
    await deleteConversation.mutateAsync(conversationId);
    setDeleteOpen(false);
    toast.success('Chat deleted');
    navigate('/chat');
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

      {/* Desktop: direct Share button. */}
      <Button
        variant="outline"
        size="sm"
        className="hidden shrink-0 gap-2 md:inline-flex"
        onClick={handleShare}
        disabled={!conversationId}
      >
        <Share2 className="h-4 w-4" />
        Share
      </Button>

      {/* Mobile: kebab menu with rename / share / delete. */}
      {conversationId && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              aria-label="Chat options"
              className="shrink-0 md:hidden"
            >
              <MoreVertical className="h-5 w-5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onSelect={() => setRenameOpen(true)}>
              <Pencil className="h-4 w-4" />
              Rename chat
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={() => void handleShare()}>
              <Share2 className="h-4 w-4" />
              Share
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onSelect={() => setDeleteOpen(true)}
              className="bg-destructive/10 text-destructive focus:bg-destructive/20 focus:text-destructive"
            >
              <Trash2 className="h-4 w-4" />
              Delete chat
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      )}

      <RenameDialog
        open={renameOpen}
        initialTitle={title ?? ''}
        isSaving={renameConversation.isPending}
        onCancel={() => setRenameOpen(false)}
        onSave={handleRenameSave}
      />

      <DeleteConfirmationDialog
        open={deleteOpen}
        conversationTitle={title ?? ''}
        isDeleting={deleteConversation.isPending}
        onCancel={() => setDeleteOpen(false)}
        onConfirm={handleConfirmDelete}
      />
    </header>
  );
}
