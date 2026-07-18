import { ConflictException, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import * as argon2 from '@node-rs/argon2';
import { Repository } from 'typeorm';
import { AuthService } from './auth.service';
import { User } from './entities/user.entity';

jest.mock('@node-rs/argon2');

const mockedArgon2 = argon2 as jest.Mocked<typeof argon2>;

describe('AuthService', () => {
  let service: AuthService;
  let userRepo: jest.Mocked<Pick<Repository<User>, 'findOne' | 'create' | 'save'>>;
  let jwtService: jest.Mocked<Pick<JwtService, 'sign'>>;

  const existingUser: User = {
    id: 'user-1',
    email: 'analyst@example.com',
    passwordHash: 'hashed-pw',
    createdAt: new Date('2026-07-14T10:00:00.000Z'),
  };

  beforeEach(async () => {
    userRepo = {
      findOne: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
    };
    jwtService = { sign: jest.fn().mockReturnValue('signed.jwt.token') };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: getRepositoryToken(User), useValue: userRepo },
        { provide: JwtService, useValue: jwtService },
      ],
    }).compile();

    service = module.get(AuthService);
    jest.clearAllMocks();
  });

  describe('register', () => {
    it('creates a new user and returns a token', async () => {
      userRepo.findOne.mockResolvedValue(null);
      mockedArgon2.hash.mockResolvedValue('new-hash');
      userRepo.create.mockReturnValue({ ...existingUser, passwordHash: 'new-hash' });
      userRepo.save.mockResolvedValue({ ...existingUser, passwordHash: 'new-hash' });

      const result = await service.register({
        email: 'analyst@example.com',
        password: 'securepassword123',
      });

      expect(mockedArgon2.hash).toHaveBeenCalledWith('securepassword123');
      expect(result.accessToken).toBe('signed.jwt.token');
      expect(result.user).toEqual({
        id: 'user-1',
        email: 'analyst@example.com',
        createdAt: '2026-07-14T10:00:00.000Z',
      });
      expect(jwtService.sign).toHaveBeenCalledWith({
        sub: 'user-1',
        email: 'analyst@example.com',
      });
    });

    it('rejects a duplicate email with ConflictException', async () => {
      userRepo.findOne.mockResolvedValue(existingUser);

      await expect(
        service.register({ email: 'analyst@example.com', password: 'securepassword123' }),
      ).rejects.toBeInstanceOf(ConflictException);
      expect(userRepo.save).not.toHaveBeenCalled();
    });
  });

  describe('login / validateUser', () => {
    it('returns a token on valid credentials', async () => {
      userRepo.findOne.mockResolvedValue(existingUser);
      mockedArgon2.verify.mockResolvedValue(true);

      const result = await service.login({
        email: 'analyst@example.com',
        password: 'securepassword123',
      });

      expect(mockedArgon2.verify).toHaveBeenCalledWith('hashed-pw', 'securepassword123');
      expect(result.accessToken).toBe('signed.jwt.token');
      expect(result.user.id).toBe('user-1');
    });

    it('throws Unauthorized when the email is unknown', async () => {
      userRepo.findOne.mockResolvedValue(null);

      await expect(
        service.login({ email: 'missing@example.com', password: 'whatever12' }),
      ).rejects.toBeInstanceOf(UnauthorizedException);
      expect(mockedArgon2.verify).not.toHaveBeenCalled();
    });

    it('throws Unauthorized when the password is wrong', async () => {
      userRepo.findOne.mockResolvedValue(existingUser);
      mockedArgon2.verify.mockResolvedValue(false);

      await expect(
        service.login({ email: 'analyst@example.com', password: 'wrongpassword' }),
      ).rejects.toBeInstanceOf(UnauthorizedException);
    });
  });

  describe('getProfile', () => {
    it('returns the user profile DTO', async () => {
      userRepo.findOne.mockResolvedValue(existingUser);

      const result = await service.getProfile('user-1');

      expect(result).toEqual({
        id: 'user-1',
        email: 'analyst@example.com',
        createdAt: '2026-07-14T10:00:00.000Z',
      });
    });

    it('throws Unauthorized when the user no longer exists', async () => {
      userRepo.findOne.mockResolvedValue(null);

      await expect(service.getProfile('ghost')).rejects.toBeInstanceOf(
        UnauthorizedException,
      );
    });
  });
});
