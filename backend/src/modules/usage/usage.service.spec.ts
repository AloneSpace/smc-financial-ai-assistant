import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';
import { UsageService } from './usage.service';

describe('UsageService', () => {
  let service: UsageService;
  let redis: {
    get: jest.Mock;
    set: jest.Mock;
    exists: jest.Mock;
    incrbyfloat: jest.Mock;
    ttl: jest.Mock;
  };

  const config = {
    get: jest.fn((key: string) => {
      switch (key) {
        case 'app.usageBudgetUsd':
          return 1.0;
        case 'app.usageResetIntervalSeconds':
          return 3600;
        case 'ai.provider':
          return 'openai';
        case 'ai.openai.model':
          return 'gpt-4o';
        default:
          return undefined;
      }
    }),
  } as unknown as ConfigService;

  beforeEach(() => {
    redis = {
      get: jest.fn(),
      set: jest.fn().mockResolvedValue('OK'),
      exists: jest.fn(),
      incrbyfloat: jest.fn().mockResolvedValue('0'),
      ttl: jest.fn(),
    };
    service = new UsageService(redis as unknown as Redis, config);
  });

  describe('isOverLimit', () => {
    it('is false when spend is under budget', async () => {
      redis.get.mockResolvedValue('0.5');
      expect(await service.isOverLimit('u1')).toBe(false);
    });

    it('is true when spend equals the budget', async () => {
      redis.get.mockResolvedValue('1.0');
      expect(await service.isOverLimit('u1')).toBe(true);
    });

    it('is true when spend exceeds the budget', async () => {
      redis.get.mockResolvedValue('1.42');
      expect(await service.isOverLimit('u1')).toBe(true);
    });

    it('treats a missing key as zero spend', async () => {
      redis.get.mockResolvedValue(null);
      expect(await service.isOverLimit('u1')).toBe(false);
    });
  });

  describe('track', () => {
    it('SETEX on the first write to establish the TTL window', async () => {
      redis.exists.mockResolvedValue(0);
      await service.track('u1', 0.0042);
      expect(redis.set).toHaveBeenCalledWith('usage:u1', '0.0042', 'EX', 3600);
      expect(redis.incrbyfloat).not.toHaveBeenCalled();
    });

    it('INCRBYFLOAT on subsequent writes without resetting the TTL', async () => {
      redis.exists.mockResolvedValue(1);
      await service.track('u1', 0.0042);
      expect(redis.incrbyfloat).toHaveBeenCalledWith('usage:u1', 0.0042);
      expect(redis.set).not.toHaveBeenCalled();
    });

    it('ignores non-positive costs', async () => {
      await service.track('u1', 0);
      expect(redis.exists).not.toHaveBeenCalled();
      expect(redis.set).not.toHaveBeenCalled();
    });
  });

  describe('getTimeToReset', () => {
    it('returns the remaining TTL when the key is live', async () => {
      redis.ttl.mockResolvedValue(2520);
      expect(await service.getTimeToReset('u1')).toBe(2520);
    });

    it('falls back to the full interval when no TTL is set', async () => {
      redis.ttl.mockResolvedValue(-2);
      expect(await service.getTimeToReset('u1')).toBe(3600);
    });
  });

  describe('calculateCost', () => {
    it('prices tokens using the configured provider/model', () => {
      // gpt-4o: $2.50/1M input, $10/1M output.
      const cost = service.calculateCost(1_000_000, 1_000_000);
      expect(cost).toBeCloseTo(12.5, 5);
    });
  });

  describe('getSummary', () => {
    it('reports spend, budget, remaining, and reset window', async () => {
      redis.get.mockResolvedValue('0.25');
      redis.ttl.mockResolvedValue(1800);

      const summary = await service.getSummary('u1');

      expect(summary).toEqual({
        spentUsd: 0.25,
        budgetUsd: 1.0,
        remainingUsd: 0.75,
        resetInSeconds: 1800,
      });
    });

    it('never reports negative remaining budget', async () => {
      redis.get.mockResolvedValue('1.5');
      redis.ttl.mockResolvedValue(600);

      const summary = await service.getSummary('u1');

      expect(summary.remainingUsd).toBe(0);
    });
  });
});
