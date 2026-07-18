/** Blinking cursor shown at the tail of an in-progress assistant answer. */
export function StreamingIndicator() {
  return (
    <span
      className="ml-0.5 inline-block h-4 w-2 translate-y-0.5 animate-pulse bg-foreground/70"
      aria-hidden="true"
    />
  );
}
