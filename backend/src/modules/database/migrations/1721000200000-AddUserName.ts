import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Adds an optional display `name` to the `users` table. Nullable so existing
 * accounts (registered before this column) remain valid.
 */
export class AddUserName1721000200000 implements MigrationInterface {
  name = 'AddUserName1721000200000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "users" ADD COLUMN "name" VARCHAR(120)`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "name"`);
  }
}
