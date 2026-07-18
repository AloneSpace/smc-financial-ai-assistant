import { generateConversationTitle } from './conversation-title.util';

describe('generateConversationTitle', () => {
  it('returns short messages unchanged (whitespace-collapsed)', () => {
    expect(generateConversationTitle('  What was  Apple net income?  ')).toBe(
      'What was Apple net income?',
    );
  });

  it('caps long messages at 60 characters', () => {
    const long = 'A'.repeat(80);
    expect(generateConversationTitle(long)).toHaveLength(60);
  });
});
