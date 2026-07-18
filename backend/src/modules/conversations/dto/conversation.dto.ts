import { ApiProperty } from '@nestjs/swagger';
import { MessageRole } from '../entities/message.entity';

export class ConversationSummaryDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ example: 'Apple revenue trends' })
  title!: string;

  @ApiProperty({ format: 'date-time' })
  createdAt!: string;

  @ApiProperty({ format: 'date-time' })
  updatedAt!: string;
}

export class MessageDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ format: 'uuid' })
  conversationId!: string;

  @ApiProperty({ enum: ['user', 'assistant', 'tool'] })
  role!: MessageRole;

  @ApiProperty()
  content!: string;

  @ApiProperty({ type: String, nullable: true, description: 'Tool invoked for this message, if any.' })
  toolName!: string | null;

  @ApiProperty({ type: 'object', additionalProperties: true, nullable: true })
  toolInput!: Record<string, unknown> | null;

  @ApiProperty({
    type: 'array',
    items: { type: 'object', additionalProperties: true },
    nullable: true,
    description: 'Rows returned by the SQL tool, if any.',
  })
  toolOutput!: Record<string, unknown>[] | null;

  @ApiProperty({ type: Number, nullable: true })
  tokensUsed!: number | null;

  @ApiProperty({ description: 'True if the stream was stopped before completion.' })
  isPartial!: boolean;

  @ApiProperty({ format: 'date-time' })
  createdAt!: string;
}

export class ConversationWithMessagesDto extends ConversationSummaryDto {
  @ApiProperty({ type: [MessageDto] })
  messages!: MessageDto[];
}

export class PaginatedConversationsDto {
  @ApiProperty({ type: [ConversationSummaryDto] })
  data!: ConversationSummaryDto[];

  @ApiProperty({ example: 42, description: 'Total conversations for the user.' })
  total!: number;

  @ApiProperty({ example: 20 })
  limit!: number;

  @ApiProperty({ example: 0 })
  offset!: number;
}
