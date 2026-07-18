const MAX_TITLE_LENGTH = 60;

/**
 * Derives a conversation title from the first user message: whitespace-collapsed
 * and capped at 60 characters (docs/05_DATABASE.md §7.3). Wired up in Phase 3.
 */
export function generateConversationTitle(message: string): string {
  const normalized = message.trim().replace(/\s+/g, ' ');
  if (normalized.length <= MAX_TITLE_LENGTH) {
    return normalized;
  }
  return normalized.slice(0, MAX_TITLE_LENGTH).trimEnd();
}
