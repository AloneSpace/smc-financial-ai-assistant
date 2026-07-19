import { Module } from '@nestjs/common';
import { UsageController } from './usage.controller';
import { UsageService } from './usage.service';
import { UsageGuard } from './usage.guard';

/** Spend tracking + budget enforcement. Redis client comes from RedisModule. */
@Module({
  controllers: [UsageController],
  providers: [UsageService, UsageGuard],
  exports: [UsageService, UsageGuard],
})
export class UsageModule {}
