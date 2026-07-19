import 'reflect-metadata';
import { DataSource } from 'typeorm';

/**
 * Standalone TypeORM DataSource used by the TypeORM CLI for migrations.
 * The NestJS runtime uses TypeOrmModule (see app.module.ts) instead.
 */
export default new DataSource({
  type: 'postgres',
  url: process.env.DATABASE_URL,
  entities: ['src/modules/**/*.entity.ts'],
  migrations: ['src/modules/database/migrations/*.ts'],
  synchronize: false,
});
