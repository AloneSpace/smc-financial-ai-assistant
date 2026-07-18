import { IsString, IsUUID, MaxLength, MinLength } from 'class-validator';

export class SendMessageDto {
  @IsUUID('4', { message: 'conversationId must be a UUID' })
  conversationId!: string;

  @IsString()
  @MinLength(1, { message: 'message must be between 1 and 4000 characters' })
  @MaxLength(4000, { message: 'message must be between 1 and 4000 characters' })
  message!: string;
}
