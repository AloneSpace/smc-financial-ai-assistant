import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  toConversationSummaryDto,
  toConversationWithMessagesDto,
} from './conversation.mapper';
import { CreateConversationDto } from './dto/create-conversation.dto';
import {
  ConversationSummaryDto,
  ConversationWithMessagesDto,
  PaginatedConversationsDto,
} from './dto/conversation.dto';
import { ListConversationsDto } from './dto/list-conversations.dto';
import { Conversation } from './entities/conversation.entity';

@Injectable()
export class ConversationsService {
  constructor(
    @InjectRepository(Conversation)
    private readonly conversationRepo: Repository<Conversation>,
  ) {}

  /** Create an empty conversation owned by the user. */
  async create(
    userId: string,
    dto: CreateConversationDto,
  ): Promise<ConversationSummaryDto> {
    const conversation = this.conversationRepo.create({
      userId,
      title: dto.title ?? 'New Conversation',
    });
    const saved = await this.conversationRepo.save(conversation);
    return toConversationSummaryDto(saved);
  }

  /** List the user's conversations, most-recently-updated first. */
  async findAll(
    userId: string,
    query: ListConversationsDto,
  ): Promise<PaginatedConversationsDto> {
    const { limit, offset } = query;
    const [rows, total] = await this.conversationRepo.findAndCount({
      where: { userId },
      order: { updatedAt: 'DESC' },
      take: limit,
      skip: offset,
    });
    return {
      data: rows.map(toConversationSummaryDto),
      total,
      limit,
      offset,
    };
  }

  /** Fetch a single conversation with its messages in chronological order. */
  async findOne(
    userId: string,
    id: string,
  ): Promise<ConversationWithMessagesDto> {
    const conversation = await this.conversationRepo.findOne({
      where: { id },
      relations: { messages: true },
      order: { messages: { createdAt: 'ASC' } },
    });
    this.assertOwned(conversation, userId);
    return toConversationWithMessagesDto(conversation);
  }

  /** Permanently delete a conversation (messages cascade via FK). */
  async remove(userId: string, id: string): Promise<void> {
    const conversation = await this.conversationRepo.findOne({ where: { id } });
    this.assertOwned(conversation, userId);
    await this.conversationRepo.delete({ id });
  }

  /**
   * Throws 404 if the conversation does not exist, or 403 if it belongs to a
   * different user — never a 404 for an existing-but-foreign resource.
   */
  private assertOwned(
    conversation: Conversation | null,
    userId: string,
  ): asserts conversation is Conversation {
    if (!conversation) {
      throw new NotFoundException('Conversation not found');
    }
    if (conversation.userId !== userId) {
      throw new ForbiddenException();
    }
  }
}
