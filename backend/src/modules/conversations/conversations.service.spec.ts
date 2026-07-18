import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConversationsService } from './conversations.service';
import { Conversation } from './entities/conversation.entity';

function makeConversation(overrides: Partial<Conversation> = {}): Conversation {
  return {
    id: 'conv-1',
    userId: 'user-1',
    title: 'New Conversation',
    createdAt: new Date('2026-07-14T10:00:00.000Z'),
    updatedAt: new Date('2026-07-14T10:05:00.000Z'),
    messages: [],
    ...overrides,
  };
}

describe('ConversationsService', () => {
  let service: ConversationsService;
  let repo: jest.Mocked<
    Pick<Repository<Conversation>, 'create' | 'save' | 'findAndCount' | 'findOne' | 'delete'>
  >;

  beforeEach(async () => {
    repo = {
      create: jest.fn(),
      save: jest.fn(),
      findAndCount: jest.fn(),
      findOne: jest.fn(),
      delete: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ConversationsService,
        { provide: getRepositoryToken(Conversation), useValue: repo },
      ],
    }).compile();

    service = module.get(ConversationsService);
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('defaults the title to "New Conversation"', async () => {
      const created = makeConversation();
      repo.create.mockReturnValue(created);
      repo.save.mockResolvedValue(created);

      const result = await service.create('user-1', {});

      expect(repo.create).toHaveBeenCalledWith({
        userId: 'user-1',
        title: 'New Conversation',
      });
      expect(result.id).toBe('conv-1');
      expect(result.title).toBe('New Conversation');
    });

    it('uses a provided title', async () => {
      const created = makeConversation({ title: 'Apple Analysis' });
      repo.create.mockReturnValue(created);
      repo.save.mockResolvedValue(created);

      await service.create('user-1', { title: 'Apple Analysis' });

      expect(repo.create).toHaveBeenCalledWith({
        userId: 'user-1',
        title: 'Apple Analysis',
      });
    });
  });

  describe('findAll', () => {
    it('returns a paginated, user-scoped list', async () => {
      repo.findAndCount.mockResolvedValue([[makeConversation()], 1]);

      const result = await service.findAll('user-1', { limit: 20, offset: 0 });

      expect(repo.findAndCount).toHaveBeenCalledWith({
        where: { userId: 'user-1' },
        order: { updatedAt: 'DESC' },
        take: 20,
        skip: 0,
      });
      expect(result).toEqual({
        data: [expect.objectContaining({ id: 'conv-1' })],
        total: 1,
        limit: 20,
        offset: 0,
      });
    });
  });

  describe('findOne', () => {
    it('returns the conversation with mapped messages', async () => {
      repo.findOne.mockResolvedValue(makeConversation());

      const result = await service.findOne('user-1', 'conv-1');

      expect(result.id).toBe('conv-1');
      expect(result.messages).toEqual([]);
    });

    it('throws NotFound when the conversation does not exist', async () => {
      repo.findOne.mockResolvedValue(null);

      await expect(service.findOne('user-1', 'missing')).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });

    it('throws Forbidden when the conversation belongs to another user', async () => {
      repo.findOne.mockResolvedValue(makeConversation({ userId: 'someone-else' }));

      await expect(service.findOne('user-1', 'conv-1')).rejects.toBeInstanceOf(
        ForbiddenException,
      );
    });
  });

  describe('remove', () => {
    it('deletes an owned conversation', async () => {
      repo.findOne.mockResolvedValue(makeConversation());
      repo.delete.mockResolvedValue({ affected: 1, raw: [] });

      await service.remove('user-1', 'conv-1');

      expect(repo.delete).toHaveBeenCalledWith({ id: 'conv-1' });
    });

    it('throws Forbidden for another user and does not delete', async () => {
      repo.findOne.mockResolvedValue(makeConversation({ userId: 'someone-else' }));

      await expect(service.remove('user-1', 'conv-1')).rejects.toBeInstanceOf(
        ForbiddenException,
      );
      expect(repo.delete).not.toHaveBeenCalled();
    });

    it('throws NotFound when the conversation does not exist', async () => {
      repo.findOne.mockResolvedValue(null);

      await expect(service.remove('user-1', 'missing')).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });
  });
});
