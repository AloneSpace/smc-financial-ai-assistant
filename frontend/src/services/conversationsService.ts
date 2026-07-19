import { api } from '@/services/api';
import type {
  ConversationSummary,
  ConversationWithMessages,
  PaginatedConversations,
} from '@/features/conversations/types';

interface ListParams {
  limit?: number;
  offset?: number;
}

export const conversationsService = {
  async list(params: ListParams = {}): Promise<PaginatedConversations> {
    const res = await api.get<PaginatedConversations>('/conversations', { params });
    return res.data;
  },

  async create(title?: string): Promise<ConversationSummary> {
    const res = await api.post<ConversationSummary>(
      '/conversations',
      title ? { title } : {},
    );
    return res.data;
  },

  async get(id: string): Promise<ConversationWithMessages> {
    const res = await api.get<ConversationWithMessages>(`/conversations/${id}`);
    return res.data;
  },

  async rename(id: string, title: string): Promise<ConversationSummary> {
    const res = await api.patch<ConversationSummary>(`/conversations/${id}`, {
      title,
    });
    return res.data;
  },

  async remove(id: string): Promise<void> {
    await api.delete(`/conversations/${id}`);
  },
};
