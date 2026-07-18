import { Inject, Injectable, Logger } from '@nestjs/common';
import { ApiProperty } from '@nestjs/swagger';
import { InjectDataSource } from '@nestjs/typeorm';
import Redis from 'ioredis';
import { DataSource } from 'typeorm';
import { REDIS_CLIENT } from '../redis/redis.constants';

export class HealthServicesStatus {
  @ApiProperty({ enum: ['up', 'down'] })
  postgres!: 'up' | 'down';

  @ApiProperty({ enum: ['up', 'down'] })
  redis!: 'up' | 'down';
}

export class HealthStatus {
  @ApiProperty({ enum: ['ok', 'degraded'] })
  status!: 'ok' | 'degraded';

  @ApiProperty({ format: 'date-time' })
  timestamp!: string;

  @ApiProperty({ type: HealthServicesStatus })
  services!: HealthServicesStatus;
}

@Injectable()
export class HealthService {
  private readonly logger = new Logger(HealthService.name);

  constructor(
    @InjectDataSource() private readonly dataSource: DataSource,
    @Inject(REDIS_CLIENT) private readonly redis: Redis,
  ) {}

  async check(): Promise<HealthStatus> {
    const [postgres, redis] = await Promise.all([
      this.checkPostgres(),
      this.checkRedis(),
    ]);

    const allUp = postgres === 'up' && redis === 'up';
    return {
      status: allUp ? 'ok' : 'degraded',
      timestamp: new Date().toISOString(),
      services: { postgres, redis },
    };
  }

  private async checkPostgres(): Promise<'up' | 'down'> {
    try {
      await this.dataSource.query('SELECT 1');
      return 'up';
    } catch (err) {
      this.logger.error(`Postgres health check failed: ${(err as Error).message}`);
      return 'down';
    }
  }

  private async checkRedis(): Promise<'up' | 'down'> {
    try {
      const pong = await this.redis.ping();
      return pong === 'PONG' ? 'up' : 'down';
    } catch (err) {
      this.logger.error(`Redis health check failed: ${(err as Error).message}`);
      return 'down';
    }
  }
}
