interface PageLoaderProps {
  /** Status text announced to screen readers and shown under the mark. */
  label?: string;
}

/** Full-screen branded loading state used while auth is being validated. */
export function PageLoader({ label = 'Loading…' }: PageLoaderProps) {
  return (
    <div
      role="status"
      aria-live="polite"
      className="flex min-h-screen flex-col items-center justify-center gap-6 bg-background"
    >
      <div className="relative flex h-16 w-16 items-center justify-center">
        <span className="absolute inset-0 animate-ping rounded-2xl bg-primary/20" />
        <span className="relative flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-600 text-2xl font-semibold text-white shadow-lg">
          F
        </span>
      </div>

      <div className="flex gap-1.5" aria-hidden="true">
        {['a', 'b', 'c'].map((dot, i) => (
          <span
            key={dot}
            className="h-2 w-2 animate-dot-pulse rounded-full bg-primary"
            style={{ animationDelay: `${i * 0.16}s` }}
          />
        ))}
      </div>

      <p className="text-sm text-muted-foreground">{label}</p>
    </div>
  );
}
