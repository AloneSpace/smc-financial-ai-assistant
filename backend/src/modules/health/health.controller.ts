import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { HealthService, HealthStatus } from './health.service';

@ApiTags('health')
@Controller('health')
export class HealthController {
  constructor(private readonly healthService: HealthService) {}

  @Get()
  @ApiOperation({ summary: 'Liveness + Postgres/Redis dependency check' })
  @ApiResponse({ status: 200, description: 'Service and dependency health.', type: HealthStatus })
  check(): Promise<HealthStatus> {
    return this.healthService.check();
  }
}
