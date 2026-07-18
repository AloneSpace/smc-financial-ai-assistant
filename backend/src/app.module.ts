import { join } from 'path';
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import appConfig from './config/app.config';
import databaseConfig from './config/database.config';
import redisConfig from './config/redis.config';
import anthropicConfig from './config/anthropic.config';
import { RedisModule } from './modules/redis/redis.module';
import { HealthModule } from './modules/health/health.module';
import { AuthModule } from './modules/auth/auth.module';
import { ConversationsModule } from './modules/conversations/conversations.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      // Local dev reads the repo-root .env; Docker injects env directly.
      envFilePath: ['../.env', '.env'],
      load: [appConfig, databaseConfig, redisConfig, anthropicConfig],
    }),
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        type: 'postgres',
        url: config.get<string>('database.url'),
        autoLoadEntities: true,
        synchronize: config.get<boolean>('database.synchronize'),
        logging: config.get<boolean>('database.logging'),
        // Migrations are the single source of schema truth (synchronize is off).
        // They run automatically on startup so a fresh DB is ready to use.
        migrations: [join(__dirname, 'modules/database/migrations/*.{ts,js}')],
        migrationsRun: true,
      }),
    }),
    RedisModule,
    HealthModule,
    AuthModule,
    ConversationsModule,
  ],
})
export class AppModule {}
