import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Conversation } from './conversation.entity';

export type MessageRole = 'user' | 'assistant' | 'tool';

/**
 * `messages` table — one turn in a conversation. `tool` rows carry the SQL
 * query (`toolInput`) and its result rows (`toolOutput`) for context replay.
 * Schema is defined by migrations; this entity is a data shape only.
 */
@Entity('messages')
export class Message {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'conversation_id', type: 'uuid' })
  conversationId!: string;

  @Column({ type: 'varchar', length: 20 })
  role!: MessageRole;

  @Column({ type: 'text', default: '' })
  content!: string;

  @Column({ name: 'tool_name', type: 'varchar', length: 100, nullable: true })
  toolName!: string | null;

  @Column({ name: 'tool_input', type: 'jsonb', nullable: true })
  toolInput!: Record<string, unknown> | null;

  @Column({ name: 'tool_output', type: 'jsonb', nullable: true })
  toolOutput!: Record<string, unknown>[] | null;

  @Column({ name: 'tokens_used', type: 'integer', nullable: true })
  tokensUsed!: number | null;

  @Column({ name: 'is_partial', type: 'boolean', default: false })
  isPartial!: boolean;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @ManyToOne(() => Conversation, (conversation) => conversation.messages, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'conversation_id' })
  conversation!: Conversation;
}
