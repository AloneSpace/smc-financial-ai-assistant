import { ExecutionContext, HttpException } from '@nestjs/common';
import { UsageGuard } from './usage.guard';
import { UsageService } from './usage.service';

function contextForUser(userId: string | undefined): ExecutionContext {
  return {
    switchToHttp: () => ({
      getRequest: () => ({ user: userId ? { id: userId } : undefined }),
    }),
  } as unknown as ExecutionContext;
}

describe('UsageGuard', () => {
  let guard: UsageGuard;
  let usageService: jest.Mocked<Pick<UsageService, 'isOverLimit' | 'getTimeToReset'>>;

  beforeEach(() => {
    usageService = {
      isOverLimit: jest.fn(),
      getTimeToReset: jest.fn(),
    };
    guard = new UsageGuard(usageService as unknown as UsageService);
  });

  it('allows the request when the user is under budget', async () => {
    usageService.isOverLimit.mockResolvedValue(false);
    await expect(guard.canActivate(contextForUser('u1'))).resolves.toBe(true);
  });

  it('throws 429 with a resetIn payload when over budget', async () => {
    usageService.isOverLimit.mockResolvedValue(true);
    usageService.getTimeToReset.mockResolvedValue(2520);

    await expect(guard.canActivate(contextForUser('u1'))).rejects.toThrow(
      HttpException,
    );

    try {
      await guard.canActivate(contextForUser('u1'));
      fail('expected the guard to throw');
    } catch (err) {
      const response = (err as HttpException).getResponse() as {
        statusCode: number;
        resetIn: number;
        message: string;
      };
      expect((err as HttpException).getStatus()).toBe(429);
      expect(response.resetIn).toBe(2520);
      expect(response.message).toContain('42 minutes');
    }
  });

  it('defers to JwtAuthGuard (allows) when no user is present', async () => {
    await expect(guard.canActivate(contextForUser(undefined))).resolves.toBe(
      true,
    );
    expect(usageService.isOverLimit).not.toHaveBeenCalled();
  });
});
