import { MessageRole } from '../entities/message.entity';

export interface ConversationSummaryDto {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
}

export interface MessageDto {
  id: string;
  conversationId: string;
  role: MessageRole;
  content: string;
  toolName: string | null;
  toolInput: Record<string, unknown> | null;
  toolOutput: Record<string, unknown>[] | null;
  tokensUsed: number | null;
  isPartial: boolean;
  createdAt: string;
}

export interface ConversationWithMessagesDto extends ConversationSummaryDto {
  messages: MessageDto[];
}

export interface PaginatedConversationsDto {
  data: ConversationSummaryDto[];
  total: number;
  limit: number;
  offset: number;
}
