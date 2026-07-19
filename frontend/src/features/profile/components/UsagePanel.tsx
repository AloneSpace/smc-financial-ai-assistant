import { useUsage } from '../hooks/useUsage';

interface UsagePanelProps {
  /** Whether the panel is visible (gates the query). */
  active: boolean;
}

function formatUsd(value: number): string {
  return `$${value.toFixed(4)}`;
}

function formatReset(seconds: number): string {
  if (seconds <= 0) return 'now';
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return rest ? `${hours}h ${rest}m` : `${hours}h`;
}

/** "Usage" tab: current budget-window spend against the hourly budget. */
export function UsagePanel({ active }: UsagePanelProps) {
  const { data, isLoading, isError } = useUsage(active);

  if (isLoading) {
    return <p className="text-sm text-muted-foreground">Loading usage…</p>;
  }
  if (isError || !data) {
    return <p className="text-sm text-destructive">Couldn’t load usage.</p>;
  }

  const pct =
    data.budgetUsd > 0
      ? Math.min((data.spentUsd / data.budgetUsd) * 100, 100)
      : 0;

  return (
    <div className="space-y-5">
      <div className="space-y-2">
        <div className="flex items-baseline justify-between">
          <span className="text-sm text-muted-foreground">Spent this window</span>
          <span className="text-sm font-medium">
            {formatUsd(data.spentUsd)}{' '}
            <span className="text-muted-foreground">/ {formatUsd(data.budgetUsd)}</span>
          </span>
        </div>
        <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
          <div
            className="h-full rounded-full bg-primary transition-all"
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>

      <dl className="grid grid-cols-2 gap-3 text-sm">
        <div className="rounded-md border bg-muted/30 p-3">
          <dt className="text-xs text-muted-foreground">Remaining</dt>
          <dd className="mt-1 font-medium">{formatUsd(data.remainingUsd)}</dd>
        </div>
        <div className="rounded-md border bg-muted/30 p-3">
          <dt className="text-xs text-muted-foreground">Resets in</dt>
          <dd className="mt-1 font-medium">{formatReset(data.resetInSeconds)}</dd>
        </div>
      </dl>

      <p className="text-xs text-muted-foreground">
        Budget resets on a rolling hourly window from your first request.
      </p>
    </div>
  );
}
