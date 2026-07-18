import { Inject, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';
import { REDIS_CLIENT } from '../redis/redis.constants';
import { AiProvider } from '../../config/ai.config';
import { estimateCostUsd } from '../ai/pricing.util';

/**
 * Per-user hourly spend tracking backed by Redis. A single float key per user
 * holds accumulated USD spend with a TTL that resets the budget window.
 *
 *   Key:   usage:{userId}
 *   Value: float string (e.g. "0.00482")
 *   TTL:   USAGE_RESET_INTERVAL_SECONDS (default 3600)
 */
@Injectable()
export class UsageService {
  private readonly logger = new Logger(UsageService.name);
  private readonly budgetUsd: number;
  private readonly resetIntervalSeconds: number;

  constructor(
    @Inject(REDIS_CLIENT) private readonly redis: Redis,
    private readonly config: ConfigService,
  ) {
    this.budgetUsd = this.config.get<number>('app.usageBudgetUsd') ?? 1.0;
    this.resetIntervalSeconds =
      this.config.get<number>('app.usageResetIntervalSeconds') ?? 3600;
  }

  private key(userId: string): string {
    return `usage:${userId}`;
  }

  /** Current accumulated spend for the user in this budget window. */
  async getSpend(userId: string): Promise<number> {
    const raw = await this.redis.get(this.key(userId));
    const spent = raw ? parseFloat(raw) : 0;
    return Number.isFinite(spent) ? spent : 0;
  }

  /** True when the user has met or exceeded their hourly budget. */
  async isOverLimit(userId: string): Promise<boolean> {
    return (await this.getSpend(userId)) >= this.budgetUsd;
  }

  /** Seconds until the current budget window resets. */
  async getTimeToReset(userId: string): Promise<number> {
    const ttl = await this.redis.ttl(this.key(userId));
    return ttl > 0 ? ttl : this.resetIntervalSeconds;
  }

  /**
   * Adds cost to the user's window. The first write uses SETEX to set value +
   * TTL atomically; later writes INCRBYFLOAT and deliberately do NOT extend the
   * TTL, so the window stays anchored to the first spend.
   */
  async track(userId: string, costUsd: number): Promise<void> {
    if (costUsd <= 0) return;
    const key = this.key(userId);
    try {
      const exists = await this.redis.exists(key);
      if (exists) {
        await this.redis.incrbyfloat(key, costUsd);
      } else {
        await this.redis.set(
          key,
          costUsd.toString(),
          'EX',
          this.resetIntervalSeconds,
        );
      }
    } catch (err) {
      // Never fail a completed chat because usage bookkeeping hiccuped.
      this.logger.warn(
        `Failed to track usage for ${userId}: ${err instanceof Error ? err.message : err}`,
      );
    }
  }

  /** USD cost for a token count using the configured provider/model pricing. */
  calculateCost(promptTokens: number, completionTokens: number): number {
    const provider = this.config.get<AiProvider>('ai.provider') ?? 'openai';
    const model =
      this.config.get<string>(`ai.${provider}.model`) ??
      (provider === 'anthropic' ? 'claude-opus-4-8' : 'gpt-4o');
    return estimateCostUsd(provider, model, promptTokens, completionTokens);
  }
}
