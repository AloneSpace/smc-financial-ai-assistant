import { LogOut, Plus } from 'lucide-react';
import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '@/features/auth/AuthContext';
import { Button } from '@/shared/components/ui/button';
import {
  useConversations,
  useCreateConversation,
  useDeleteConversation,
} from '../hooks/useConversations';
import type { ConversationSummary } from '../types';
import { ConversationItem } from './ConversationItem';
import { ConversationSkeleton } from './ConversationSkeleton';
import { DeleteConfirmationDialog } from './DeleteConfirmationDialog';

export function ConversationSidebar() {
  const { conversationId } = useParams();
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  const { data, isLoading, isError } = useConversations();
  const createConversation = useCreateConversation();
  const deleteConversation = useDeleteConversation();

  const [pendingDelete, setPendingDelete] = useState<ConversationSummary | null>(null);

  const handleNewChat = async () => {
    const conversation = await createConversation.mutateAsync(undefined);
    navigate(`/chat/${conversation.id}`);
  };

  const handleConfirmDelete = async () => {
    if (!pendingDelete) return;
    const deletedId = pendingDelete.id;
    await deleteConversation.mutateAsync(deletedId);
    setPendingDelete(null);
    if (deletedId === conversationId) {
      navigate('/chat');
    }
  };

  const conversations = data?.data ?? [];

  return (
    <aside className="flex h-full w-72 shrink-0 flex-col border-r bg-muted/20">
      <div className="p-3">
        <Button
          className="w-full justify-start"
          onClick={handleNewChat}
          disabled={createConversation.isPending}
        >
          <Plus className="h-4 w-4" />
          New chat
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
            />
          ))}
        </div>
      </nav>

      <div className="flex items-center gap-2 border-t p-3">
        <span className="min-w-0 flex-1 truncate text-sm text-muted-foreground">
          {user?.email}
        </span>
        <Button variant="ghost" size="icon" aria-label="Log out" onClick={logout}>
          <LogOut className="h-4 w-4" />
        </Button>
      </div>

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
