import { ChevronsUpDown, Plus, X } from 'lucide-react';
import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { toast } from 'sonner';
import { useAuthStore } from '@/store/authStore';
import { Button } from '@/components/ui/button';
import { UserAvatar } from '@/components/common/UserAvatar';
import { ProfileModal } from '@/features/profile/components/ProfileModal';
import { cn } from '@/utils/cn';
import {
  useConversations,
  useCreateConversation,
  useDeleteConversation,
  useRenameConversation,
} from '../hooks/useConversations';
import type { ConversationSummary } from '../types';
import { ConversationItem } from './ConversationItem';
import { ConversationSkeleton } from './ConversationSkeleton';
import { DeleteConfirmationDialog } from './DeleteConfirmationDialog';

interface ConversationSidebarProps {
  /** Whether the mobile drawer is open. Ignored at md+ (always visible). */
  isOpen: boolean;
  onClose: () => void;
}

export function ConversationSidebar({
  isOpen,
  onClose,
}: ConversationSidebarProps) {
  const { conversationId } = useParams();
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);

  const { data, isLoading, isError } = useConversations();
  const createConversation = useCreateConversation();
  const deleteConversation = useDeleteConversation();
  const renameConversation = useRenameConversation();

  const [pendingDelete, setPendingDelete] = useState<ConversationSummary | null>(null);
  const [profileOpen, setProfileOpen] = useState(false);

  const handleNewChat = async () => {
    const conversation = await createConversation.mutateAsync(undefined);
    navigate(`/chat/${conversation.id}`);
    onClose();
  };

  const handleConfirmDelete = async () => {
    if (!pendingDelete) return;
    const deletedId = pendingDelete.id;
    const deletedTitle = pendingDelete.title;
    await deleteConversation.mutateAsync(deletedId);
    setPendingDelete(null);
    toast.success(`Deleted “${deletedTitle}”`);
    if (deletedId === conversationId) {
      navigate('/chat');
    }
  };

  const handleRename = async (id: string, title: string) => {
    await renameConversation.mutateAsync({ id, title });
    toast.success(`Renamed to “${title}”`);
  };

  const conversations = data?.data ?? [];

  return (
    <aside
      className={cn(
        'flex h-full w-72 shrink-0 flex-col border-r bg-background',
        // Mobile: fixed slide-in drawer. md+: static column.
        'fixed inset-y-0 left-0 z-40 transition-transform duration-200 md:static md:z-auto md:translate-x-0',
        isOpen ? 'translate-x-0 shadow-xl' : '-translate-x-full',
      )}
    >
      <div className="flex items-center gap-2 p-3">
        <Button
          className="w-full justify-start text-white"
          onClick={handleNewChat}
          disabled={createConversation.isPending}
        >
          <Plus className="h-4 w-4" />
          New chat
        </Button>
        <Button
          variant="ghost"
          size="icon"
          aria-label="Close conversations"
          className="shrink-0 md:hidden"
          onClick={onClose}
        >
          <X className="h-5 w-5" />
        </Button>
      </div>

      <nav className="flex-1 overflow-y-auto px-2 pb-2">
        {isLoading && <ConversationSkeleton />}
        {isError && (
          <p className="px-3 py-2 text-sm text-destructive">
            Couldn&apos;t load conversations.
          </p>
        )}
        {!isLoading && !isError && conversations.length === 0 && (
          <p className="px-3 py-8 text-center text-sm text-muted-foreground">
            No conversations yet
          </p>
        )}
        <div className="space-y-1">
          {conversations.map((conversation) => (
            <ConversationItem
              key={conversation.id}
              conversation={conversation}
              isActive={conversation.id === conversationId}
              onRequestDelete={setPendingDelete}
              onRename={handleRename}
              onNavigate={onClose}
            />
          ))}
        </div>
      </nav>

      <div className="border-t p-2">
        <button
          type="button"
          onClick={() => setProfileOpen(true)}
          aria-label="Open account"
          className="flex w-full items-center gap-3 rounded-md p-2 text-left transition-colors hover:bg-accent/50"
        >
          {user && <UserAvatar name={user.name} email={user.email} />}
          <span className="min-w-0 flex-1">
            <span className="block truncate text-sm font-medium">
              {user?.name ?? 'Account'}
            </span>
            <span className="block truncate text-xs text-muted-foreground">
              {user?.email}
            </span>
          </span>
          <ChevronsUpDown className="h-4 w-4 shrink-0 text-muted-foreground" />
        </button>
      </div>

      <ProfileModal open={profileOpen} onOpenChange={setProfileOpen} />

      <DeleteConfirmationDialog
        open={pendingDelete !== null}
        conversationTitle={pendingDelete?.title ?? ''}
        isDeleting={deleteConversation.isPending}
        onCancel={() => setPendingDelete(null)}
        onConfirm={handleConfirmDelete}
      />
    </aside>
  );
}
