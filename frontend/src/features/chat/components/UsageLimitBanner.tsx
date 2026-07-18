import { useEffect, useState } from 'react';
import { Clock } from 'lucide-react';

interface UsageLimitBannerProps {
  /** Seconds until the budget resets (from the 429 response). */
  resetIn: number;
  message: string;
  /** Called once the countdown reaches zero so input can be re-enabled. */
  onExpire: () => void;
}

function formatCountdown(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  if (mins <= 0) return `${secs}s`;
  return `${mins}m ${secs.toString().padStart(2, '0')}s`;
}

/**
 * Amber banner shown above the composer when the hourly budget is exhausted.
 * Counts down in real time and calls `onExpire` when the window resets.
 */
export function UsageLimitBanner({
  resetIn,
  message,
  onExpire,
}: UsageLimitBannerProps) {
  const [remaining, setRemaining] = useState(resetIn);

  useEffect(() => {
    setRemaining(resetIn);
  }, [resetIn]);

  useEffect(() => {
    if (remaining <= 0) {
      onExpire();
      return;
    }
    const timer = window.setInterval(() => {
      setRemaining((prev) => prev - 1);
    }, 1000);
    return () => window.clearInterval(timer);
  }, [remaining, onExpire]);

  return (
    <div className="mx-auto flex w-full max-w-3xl items-center gap-2 px-4">
      <div className="flex w-full items-center gap-2 rounded-lg border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-sm text-amber-700 dark:text-amber-300">
        <Clock className="h-4 w-4 shrink-0" />
        <span className="flex-1">{message}</span>
        <span className="shrink-0 font-mono tabular-nums">
          Resets in {formatCountdown(Math.max(remaining, 0))}
        </span>
      </div>
    </div>
  );
}
