import {
  CanActivate,
  ExecutionContext,
  HttpException,
  HttpStatus,
  Injectable,
} from '@nestjs/common';
import type { Request } from 'express';
import { AuthenticatedUser } from '../auth/jwt.types';
import { UsageService } from './usage.service';

/**
 * Rejects chat requests once the authenticated user has spent their hourly
 * budget. Must run after JwtAuthGuard so `req.user` is populated.
 */
@Injectable()
export class UsageGuard implements CanActivate {
  constructor(private readonly usageService: UsageService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context
      .switchToHttp()
      .getRequest<Request & { user?: AuthenticatedUser }>();
    const userId = request.user?.id;
    if (!userId) return true; // JwtAuthGuard already handles unauthenticated.

    if (await this.usageService.isOverLimit(userId)) {
      const resetIn = await this.usageService.getTimeToReset(userId);
      const minutes = Math.ceil(resetIn / 60);
      throw new HttpException(
        {
          statusCode: HttpStatus.TOO_MANY_REQUESTS,
          message: `You have reached your hourly usage limit. Your budget will reset in ${minutes} minute${minutes === 1 ? '' : 's'}.`,
          resetIn,
        },
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }
    return true;
  }
}
