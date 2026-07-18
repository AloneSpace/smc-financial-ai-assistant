import { BadRequestException } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { SqlToolService } from './sql-tool.service';

describe('SqlToolService', () => {
  let service: SqlToolService;
  let query: jest.Mock;

  beforeEach(() => {
    query = jest.fn();
    const dataSource = { query } as unknown as DataSource;
    service = new SqlToolService(dataSource);
  });

  describe('validateSql', () => {
    it('accepts a plain SELECT against financial_data', () => {
      expect(() =>
        service.validateSql(
          "SELECT net_income FROM financial_data WHERE company = 'Apple'",
        ),
      ).not.toThrow();
    });

    it('accepts a SELECT with a single trailing semicolon', () => {
      expect(() =>
        service.validateSql('SELECT * FROM financial_data;'),
      ).not.toThrow();
    });

    it.each([
      ['INSERT', "INSERT INTO financial_data VALUES ('x')"],
      ['UPDATE', 'UPDATE financial_data SET revenue = 0'],
      ['DELETE', 'DELETE FROM financial_data'],
      ['DROP', 'DROP TABLE financial_data'],
      ['ALTER', 'ALTER TABLE financial_data ADD col int'],
      ['CREATE', 'CREATE TABLE x (id int)'],
      ['TRUNCATE', 'TRUNCATE financial_data'],
    ])('rejects %s statements', (_label, sql) => {
      expect(() => service.validateSql(sql)).toThrow(BadRequestException);
    });

    it('rejects a query that does not start with SELECT', () => {
      expect(() => service.validateSql('WITH x AS (SELECT 1) SELECT 1')).toThrow(
        BadRequestException,
      );
    });

    it('rejects multi-statement queries', () => {
      expect(() =>
        service.validateSql(
          'SELECT * FROM financial_data; SELECT * FROM users',
        ),
      ).toThrow(BadRequestException);
    });

    it.each(['users', 'conversations', 'messages'])(
      'rejects queries against the %s table',
      (table) => {
        expect(() =>
          service.validateSql(`SELECT * FROM ${table}`),
        ).toThrow(BadRequestException);
      },
    );

    it('rejects a SELECT that does not reference financial_data', () => {
      expect(() => service.validateSql('SELECT 1')).toThrow(
        BadRequestException,
      );
    });

    it('rejects an empty query', () => {
      expect(() => service.validateSql('   ')).toThrow(BadRequestException);
    });
  });

  describe('execute', () => {
    it('validates before running and caps results at 100 rows', async () => {
      const many = Array.from({ length: 150 }, (_, i) => ({ n: i }));
      query.mockResolvedValue(many);

      const result = await service.execute('SELECT n FROM financial_data');

      expect(result.rowCount).toBe(100);
      expect(result.rows).toHaveLength(100);
      expect(query).toHaveBeenCalledTimes(1);
    });

    it('strips a trailing semicolon before executing', async () => {
      query.mockResolvedValue([]);
      await service.execute('SELECT * FROM financial_data;');
      expect(query).toHaveBeenCalledWith('SELECT * FROM financial_data');
    });

    it('never runs an invalid query', async () => {
      await expect(service.execute('DELETE FROM financial_data')).rejects.toThrow(
        BadRequestException,
      );
      expect(query).not.toHaveBeenCalled();
    });

    it('translates DB errors into a generic BadRequestException', async () => {
      query.mockRejectedValue(new Error('column "foo" does not exist'));
      await expect(
        service.execute('SELECT foo FROM financial_data'),
      ).rejects.toThrow(BadRequestException);
    });
  });
});
