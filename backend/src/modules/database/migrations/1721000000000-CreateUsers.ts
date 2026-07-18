import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Creates the `users` table (see docs/05_DATABASE.md §5.1).
 * `gen_random_uuid()` is built into PostgreSQL 13+; pgcrypto is enabled
 * defensively so the default works on older engines too.
 */
export class CreateUsers1721000000000 implements MigrationInterface {
  name = 'CreateUsers1721000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS pgcrypto`);
    await queryRunner.query(`
      CREATE TABLE "users" (
        "id"            UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
        "email"         VARCHAR(255) UNIQUE NOT NULL,
        "password_hash" VARCHAR(255) NOT NULL,
        "created_at"    TIMESTAMPTZ  NOT NULL DEFAULT now()
      )
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "users"`);
  }
}
