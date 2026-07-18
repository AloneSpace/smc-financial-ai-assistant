import { Module } from '@nestjs/common';
import { UsageService } from './usage.service';
import { UsageGuard } from './usage.guard';

/** Spend tracking + budget enforcement. Redis client comes from RedisModule. */
@Module({
  providers: [UsageService, UsageGuard],
  exports: [UsageService, UsageGuard],
})
export class UsageModule {}
