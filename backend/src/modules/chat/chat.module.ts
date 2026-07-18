import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Conversation } from '../conversations/entities/conversation.entity';
import { Message } from '../conversations/entities/message.entity';
import { AiModule } from '../ai/ai.module';
import { UsageModule } from '../usage/usage.module';
import { ChatController } from './chat.controller';
import { ChatService } from './chat.service';
import { SqlToolService } from './sql-tool.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([Conversation, Message]),
    AiModule,
    UsageModule,
  ],
  controllers: [ChatController],
  providers: [ChatService, SqlToolService],
})
export class ChatModule {}
