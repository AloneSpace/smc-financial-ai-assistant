import { useEffect } from 'react';
import { AlertCircle, X } from 'lucide-react';

interface ErrorToastProps {
  message: string;
  onDismiss: () => void;
  /** Auto-dismiss delay in ms. Defaults to 5s. */
  duration?: number;
}

/** Top-right transient error notification. Auto-dismisses; also dismissable. */
export function ErrorToast({
  message,
  onDismiss,
  duration = 5000,
}: ErrorToastProps) {
  useEffect(() => {
    const timer = window.setTimeout(onDismiss, duration);
    return () => window.clearTimeout(timer);
  }, [onDismiss, duration]);

  return (
    <div
      role="alert"
      className="fixed right-4 top-4 z-50 flex max-w-sm items-start gap-2 rounded-lg border border-destructive/40 bg-card px-4 py-3 text-sm text-destructive shadow-lg"
    >
      <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
      <span className="flex-1">{message}</span>
      <button
        type="button"
        onClick={onDismiss}
        aria-label="Dismiss"
        className="rounded p-0.5 text-muted-foreground hover:bg-accent"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}
