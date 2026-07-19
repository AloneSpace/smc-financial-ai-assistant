import { registerAs } from '@nestjs/config';

/** Core application / runtime configuration. */
export default registerAs('app', () => ({
  port: parseInt(process.env.PORT ?? '3000', 10),
  nodeEnv: process.env.NODE_ENV ?? 'development',
  frontendUrl: process.env.FRONTEND_URL ?? 'http://localhost:5173',
  jwtSecret: process.env.JWT_SECRET,
  jwtExpiry: process.env.JWT_EXPIRY ?? '24h',
  usageBudgetUsd: parseFloat(process.env.USAGE_BUDGET_USD ?? '1.0'),
  usageResetIntervalSeconds: parseInt(
    process.env.USAGE_RESET_INTERVAL_SECONDS ?? '3600',
    10,
  ),
}));
