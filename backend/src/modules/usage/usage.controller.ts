import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AuthenticatedUser } from '../auth/jwt.types';
import { UsageSummaryDto } from './dto/usage-summary.dto';
import { UsageService } from './usage.service';

@ApiTags('usage')
@ApiBearerAuth('bearer')
@Controller('usage')
@UseGuards(JwtAuthGuard)
export class UsageController {
  constructor(private readonly usageService: UsageService) {}

  @Get()
  @ApiOperation({ summary: 'Get the current user’s budget-window usage' })
  @ApiResponse({ status: 200, description: 'Usage summary.', type: UsageSummaryDto })
  @ApiResponse({ status: 401, description: 'Missing or invalid JWT.' })
  getUsage(@CurrentUser() user: AuthenticatedUser): Promise<UsageSummaryDto> {
    return this.usageService.getSummary(user.id);
  }
}
