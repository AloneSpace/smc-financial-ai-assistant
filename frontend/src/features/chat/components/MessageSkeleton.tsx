/** Placeholder bubbles shown while a conversation's history is loading. */
export function MessageSkeleton() {
  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-4 p-4">
      <div className="flex justify-end">
        <div className="h-10 w-48 animate-pulse rounded-2xl bg-muted" />
      </div>
      <div className="flex justify-start">
        <div className="h-24 w-96 max-w-[85%] animate-pulse rounded-2xl bg-muted" />
      </div>
      <div className="flex justify-end">
        <div className="h-10 w-40 animate-pulse rounded-2xl bg-muted" />
      </div>
    </div>
  );
}
