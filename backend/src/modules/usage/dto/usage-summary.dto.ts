import { ApiProperty } from '@nestjs/swagger';

/** Current budget-window spend for the authenticated user. */
export class UsageSummaryDto {
  @ApiProperty({ example: 0.0482, description: 'USD spent this window.' })
  spentUsd!: number;

  @ApiProperty({ example: 1.0, description: 'USD budget per window.' })
  budgetUsd!: number;

  @ApiProperty({ example: 0.9518, description: 'USD remaining this window (never negative).' })
  remainingUsd!: number;

  @ApiProperty({ example: 2874, description: 'Seconds until the window resets.' })
  resetInSeconds!: number;
}
