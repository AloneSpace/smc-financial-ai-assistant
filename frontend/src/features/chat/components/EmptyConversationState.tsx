import { Sparkles } from 'lucide-react';

interface EmptyConversationStateProps {
  onSelect: (question: string) => void;
}

const EXAMPLE_QUESTIONS = [
  "What was Apple's net income in 2023?",
  'Compare Apple, Google, and Microsoft revenue in 2024',
  "Show Nvidia's revenue trend from 2022 to 2025",
  'Which companies reported a net loss in any year?',
];

/** Shown for a fresh conversation: a prompt plus clickable example questions. */
export function EmptyConversationState({
  onSelect,
}: EmptyConversationStateProps) {
  return (
    <div className="mx-auto flex max-w-2xl flex-col items-center justify-center gap-6 px-4 py-12 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
        <Sparkles className="h-6 w-6 text-primary" />
      </div>
      <div>
        <h2 className="text-lg font-semibold tracking-tight">
          Ask about US public company financials
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Every answer is grounded in the database — 49 companies, 2022–2025.
        </p>
      </div>
      <div className="grid w-full gap-2 sm:grid-cols-2">
        {EXAMPLE_QUESTIONS.map((question) => (
          <button
            key={question}
            type="button"
            onClick={() => onSelect(question)}
            className="rounded-lg border border-border bg-card px-4 py-3 text-left text-sm text-card-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
          >
            {question}
          </button>
        ))}
      </div>
    </div>
  );
}
