import { api } from '@/shared/lib/axios';
import type {
  ConversationSummary,
  ConversationWithMessages,
  PaginatedConversations,
} from '../types';

interface ListParams {
  limit?: number;
  offset?: number;
}

export const conversationsApi = {
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

  async remove(id: string): Promise<void> {
    await api.delete(`/conversations/${id}`);
  },
};
