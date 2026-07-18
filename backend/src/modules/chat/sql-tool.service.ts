import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { SqlExecutionResult } from '../ai/ai-provider.interface';

/** Hard cap on rows returned to the model to keep tool responses bounded. */
const MAX_ROWS = 100;

/** The only table the AI SQL tool may read. */
const ALLOWED_TABLE = 'financial_data';

/** Tables that must never be reachable through the AI tool. */
const FORBIDDEN_TABLES = ['users', 'conversations', 'messages'];

/** DML/DDL keywords that are rejected outright. */
const FORBIDDEN_KEYWORDS = [
  'insert',
  'update',
  'delete',
  'drop',
  'create',
  'alter',
  'truncate',
  'grant',
  'revoke',
];

/**
 * Validates and executes AI-generated SQL. Every execution runs `validateSql`
 * first — this is the single choke point that keeps the AI read-only and
 * confined to `financial_data`.
 */
@Injectable()
export class SqlToolService {
  private readonly logger = new Logger(SqlToolService.name);

  constructor(@InjectDataSource() private readonly dataSource: DataSource) {}

  /**
   * Rejects anything that is not a single, read-only SELECT against
   * `financial_data`. Throws {@link BadRequestException} on any violation.
   */
  validateSql(query: string): void {
    const trimmed = query.trim();
    if (trimmed.length === 0) {
      throw new BadRequestException('SQL query is empty.');
    }

    const normalized = trimmed.toLowerCase();

    if (!normalized.startsWith('select')) {
      throw new BadRequestException('Only SELECT queries are permitted.');
    }

    // Reject multi-statements. A single trailing semicolon is tolerated.
    const withoutTrailing = trimmed.replace(/;\s*$/, '');
    if (withoutTrailing.includes(';')) {
      throw new BadRequestException('Multi-statement queries are not allowed.');
    }

    for (const keyword of FORBIDDEN_KEYWORDS) {
      if (new RegExp(`\\b${keyword}\\b`, 'i').test(withoutTrailing)) {
        throw new BadRequestException(
          `Query contains a forbidden keyword: ${keyword.toUpperCase()}.`,
        );
      }
    }

    for (const table of FORBIDDEN_TABLES) {
      if (new RegExp(`\\b${table}\\b`, 'i').test(withoutTrailing)) {
        throw new BadRequestException(
          `Queries against '${table}' are not permitted.`,
        );
      }
    }

    if (!new RegExp(`\\b${ALLOWED_TABLE}\\b`, 'i').test(withoutTrailing)) {
      throw new BadRequestException(
        `Queries must target the '${ALLOWED_TABLE}' table.`,
      );
    }
  }

  /**
   * Validates then runs the query. Results are capped at {@link MAX_ROWS}.
   * Any DB error is logged and re-thrown as a BadRequestException with a
   * generic message (no raw DB internals leak to the client).
   */
  async execute(query: string): Promise<SqlExecutionResult> {
    this.validateSql(query);
    const withoutTrailing = query.trim().replace(/;\s*$/, '');

    let rows: Record<string, unknown>[];
    try {
      rows = await this.dataSource.query<Record<string, unknown>[]>(
        withoutTrailing,
      );
    } catch (err) {
      this.logger.warn(
        `SQL execution failed: ${err instanceof Error ? err.message : err}`,
      );
      throw new BadRequestException(
        'The generated SQL query could not be executed.',
      );
    }

    const capped = rows.slice(0, MAX_ROWS);
    return { rows: capped, rowCount: capped.length };
  }
}
