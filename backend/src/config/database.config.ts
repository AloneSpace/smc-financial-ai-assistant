import { registerAs } from '@nestjs/config';

/**
 * PostgreSQL / TypeORM configuration, sourced entirely from env.
 * `synchronize` is always false — schema changes go through migrations.
 */
export default registerAs('database', () => ({
  url: process.env.DATABASE_URL,
  synchronize: false,
  logging: process.env.NODE_ENV === 'development',
}));
