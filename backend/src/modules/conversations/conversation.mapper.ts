import {
  ConversationSummaryDto,
  ConversationWithMessagesDto,
  MessageDto,
} from './dto/conversation.dto';
import { Conversation } from './entities/conversation.entity';
import { Message } from './entities/message.entity';

export function toConversationSummaryDto(
  conversation: Conversation,
): ConversationSummaryDto {
  return {
    id: conversation.id,
    title: conversation.title,
    createdAt: conversation.createdAt.toISOString(),
    updatedAt: conversation.updatedAt.toISOString(),
  };
}

export function toMessageDto(message: Message): MessageDto {
  return {
    id: message.id,
    conversationId: message.conversationId,
    role: message.role,
    content: message.content,
    toolName: message.toolName,
    toolInput: message.toolInput,
    toolOutput: message.toolOutput,
    tokensUsed: message.tokensUsed,
    isPartial: message.isPartial,
    createdAt: message.createdAt.toISOString(),
  };
}

export function toConversationWithMessagesDto(
  conversation: Conversation,
): ConversationWithMessagesDto {
  return {
    ...toConversationSummaryDto(conversation),
    messages: (conversation.messages ?? []).map(toMessageDto),
  };
}
