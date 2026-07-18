import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { conversationsApi } from '../api/conversations.api';
import type { ConversationSummary, PaginatedConversations } from '../types';

export const conversationKeys = {
  all: ['conversations'] as const,
  detail: (id: string) => ['conversation', id] as const,
};

/** List of the current user's conversations (sidebar). */
export function useConversations() {
  return useQuery<PaginatedConversations>({
    queryKey: conversationKeys.all,
    queryFn: () => conversationsApi.list(),
  });
}

/** Create a new conversation, then refresh the sidebar list. */
export function useCreateConversation() {
  const queryClient = useQueryClient();
  return useMutation<ConversationSummary, unknown, string | undefined>({
    mutationFn: (title) => conversationsApi.create(title),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: conversationKeys.all });
    },
  });
}

/** Delete a conversation, then refresh the sidebar list. */
export function useDeleteConversation() {
  const queryClient = useQueryClient();
  return useMutation<void, unknown, string>({
    mutationFn: (id) => conversationsApi.remove(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: conversationKeys.all });
    },
  });
}
