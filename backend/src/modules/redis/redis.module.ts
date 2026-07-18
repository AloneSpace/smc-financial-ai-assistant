import {
  Global,
  Inject,
  Logger,
  Module,
  OnApplicationShutdown,
  Provider,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';
import { REDIS_CLIENT } from './redis.constants';

const redisProvider: Provider = {
  provide: REDIS_CLIENT,
  inject: [ConfigService],
  useFactory: (config: ConfigService): Redis => {
    const logger = new Logger('RedisModule');
    const url = config.get<string>('redis.url') ?? 'redis://localhost:6379';
    const client = new Redis(url, { maxRetriesPerRequest: 3 });

    client.on('connect', () => logger.log('Redis connection established'));
    client.on('error', (err: Error) =>
      logger.error(`Redis error: ${err.message}`),
    );

    return client;
  },
};

/**
 * Global module exposing a single shared ioredis client via REDIS_CLIENT.
 * Used by the usage module (spend tracking) and health checks.
 */
@Global()
@Module({
  providers: [redisProvider],
  exports: [REDIS_CLIENT],
})
export class RedisModule implements OnApplicationShutdown {
  constructor(@Inject(REDIS_CLIENT) private readonly client: Redis) {}

  async onApplicationShutdown(): Promise<void> {
    await this.client.quit();
  }
}
