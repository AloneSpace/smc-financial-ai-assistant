import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Creates the `conversations` and `messages` tables (docs/05_DATABASE.md §5.2–5.3)
 * plus their access-pattern indexes (§8.2). Deleting a conversation cascades to
 * its messages; deleting a user cascades to their conversations.
 */
export class CreateConversationsAndMessages1721000100000
  implements MigrationInterface
{
  name = 'CreateConversationsAndMessages1721000100000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "conversations" (
        "id"         UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
        "user_id"    UUID         NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
        "title"      VARCHAR(255) NOT NULL DEFAULT 'New Conversation',
        "created_at" TIMESTAMPTZ  NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMPTZ  NOT NULL DEFAULT now()
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "messages" (
        "id"              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
        "conversation_id" UUID        NOT NULL REFERENCES "conversations"("id") ON DELETE CASCADE,
        "role"            VARCHAR(20) NOT NULL CHECK ("role" IN ('user', 'assistant', 'tool')),
        "content"         TEXT        NOT NULL DEFAULT '',
        "tool_name"       VARCHAR(100),
        "tool_input"      JSONB,
        "tool_output"     JSONB,
        "tokens_used"     INTEGER,
        "is_partial"      BOOLEAN     NOT NULL DEFAULT false,
        "created_at"      TIMESTAMPTZ NOT NULL DEFAULT now()
      )
    `);

    await queryRunner.query(`
      CREATE INDEX "idx_conversations_user_id"
        ON "conversations" ("user_id", "updated_at" DESC)
    `);
    await queryRunner.query(`
      CREATE INDEX "idx_messages_conversation_id"
        ON "messages" ("conversation_id", "created_at" ASC)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "messages"`);
    await queryRunner.query(`DROP TABLE "conversations"`);
  }
}
