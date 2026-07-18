import { Test, TestingModule } from '@nestjs/testing';
import { getDataSourceToken } from '@nestjs/typeorm';
import { HealthService } from './health.service';
import { REDIS_CLIENT } from '../redis/redis.constants';

describe('HealthService', () => {
  let service: HealthService;
  const dataSource = { query: jest.fn() };
  const redis = { ping: jest.fn() };

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        HealthService,
        { provide: getDataSourceToken(), useValue: dataSource },
        { provide: REDIS_CLIENT, useValue: redis },
      ],
    }).compile();

    service = module.get<HealthService>(HealthService);
  });

  it('reports "ok" when postgres and redis are both up', async () => {
    dataSource.query.mockResolvedValue([{ '?column?': 1 }]);
    redis.ping.mockResolvedValue('PONG');

    const result = await service.check();

    expect(result.status).toBe('ok');
    expect(result.services).toEqual({ postgres: 'up', redis: 'up' });
    expect(typeof result.timestamp).toBe('string');
  });

  it('reports "degraded" when postgres is down', async () => {
    dataSource.query.mockRejectedValue(new Error('connection refused'));
    redis.ping.mockResolvedValue('PONG');

    const result = await service.check();

    expect(result.status).toBe('degraded');
    expect(result.services.postgres).toBe('down');
    expect(result.services.redis).toBe('up');
  });

  it('reports "degraded" when redis is down', async () => {
    dataSource.query.mockResolvedValue([{ '?column?': 1 }]);
    redis.ping.mockRejectedValue(new Error('redis unavailable'));

    const result = await service.check();

    expect(result.status).toBe('degraded');
    expect(result.services.redis).toBe('down');
  });
});
