/** Loading placeholder rows for the conversation sidebar. */
export function ConversationSkeleton() {
  return (
    <div className="space-y-1" aria-hidden="true">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={`skeleton-${i}`} className="px-3 py-2">
          <div className="h-4 w-3/4 animate-pulse rounded bg-muted" />
          <div className="mt-2 h-3 w-1/3 animate-pulse rounded bg-muted" />
        </div>
      ))}
    </div>
  );
}
