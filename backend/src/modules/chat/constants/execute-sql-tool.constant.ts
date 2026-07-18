import { AiToolDefinition } from '../../ai/ai-provider.interface';

/** The single tool the AI may call to read grounded financial figures. */
export const EXECUTE_SQL_TOOL: AiToolDefinition = {
  name: 'execute_sql',
  description:
    'Run a read-only SQL SELECT query against the `financial_data` table to ' +
    'retrieve financial figures. Use this for EVERY question about company ' +
    'financials — never answer from prior knowledge. Only SELECT statements ' +
    'against `financial_data` are permitted; no other tables, no semicolons, ' +
    'no INSERT/UPDATE/DELETE/DDL.',
  inputSchema: {
    type: 'object',
    properties: {
      query: {
        type: 'string',
        description:
          'A single PostgreSQL SELECT statement querying `financial_data`. ' +
          'Example: SELECT net_income FROM financial_data WHERE company = ' +
          "'Apple' AND year = 2023",
      },
    },
    required: ['query'],
    additionalProperties: false,
  },
};
