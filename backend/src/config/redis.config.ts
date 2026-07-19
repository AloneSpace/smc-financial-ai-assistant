import { registerAs } from '@nestjs/config';

/** Redis configuration for usage tracking and optional caching. */
export default registerAs('redis', () => ({
  url: process.env.REDIS_URL ?? 'redis://localhost:6379',
}));
