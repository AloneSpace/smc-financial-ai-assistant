import { useQuery } from '@tanstack/react-query';
import { conversationsService } from '@/services/conversationsService';
import { conversationKeys } from './useConversations';
import type { ConversationWithMessages } from '../types';

/** Single conversation with its full message history (chat main pane). */
export function useConversation(id: string | undefined) {
  return useQuery<ConversationWithMessages>({
    queryKey: conversationKeys.detail(id ?? 'none'),
    queryFn: () => conversationsService.get(id as string),
    enabled: Boolean(id),
  });
}
