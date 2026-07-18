export type MessageRole = 'user' | 'assistant' | 'tool';

export interface ConversationSummary {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
}

export interface Message {
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

export interface ConversationWithMessages extends ConversationSummary {
  messages: Message[];
}

export interface PaginatedConversations {
  data: ConversationSummary[];
  total: number;
  limit: number;
  offset: number;
}
