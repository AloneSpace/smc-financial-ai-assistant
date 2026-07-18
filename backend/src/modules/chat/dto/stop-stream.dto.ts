import { IsUUID } from 'class-validator';

export class StopStreamDto {
  @IsUUID('4', { message: 'conversationId must be a UUID' })
  conversationId!: string;

  @IsUUID('4', { message: 'messageId must be a UUID' })
  messageId!: string;
}
