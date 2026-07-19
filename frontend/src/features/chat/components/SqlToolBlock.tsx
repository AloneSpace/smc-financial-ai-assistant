import { AlertCircle, CheckCircle2, Database, Loader2 } from 'lucide-react';
import { cn } from '@/utils/cn';
import type { ToolBlockState } from '../types';

interface SqlToolBlockProps {
  state: ToolBlockState;
}

/**
 * Renders the `execute_sql` tool call across its four states: loading, query
 * shown, completed (with row count), and validation error.
 */
export function SqlToolBlock({ state }: SqlToolBlockProps) {
  const { status, query, rowCount, error } = state;

  return (
    <div className="my-2 overflow-hidden rounded-lg border border-border bg-muted/40 text-sm">
      <div className="flex items-center gap-2 border-b border-border/60 px-3 py-2 font-medium">
        <Header status={status} rowCount={rowCount} />
      </div>
      {query ? (
        <pre className="overflow-x-auto px-3 py-2 font-mono text-xs leading-relaxed text-muted-foreground">
          <code>{query}</code>
        </pre>
      ) : null}
      {status === 'error' && error ? (
        <p className="border-t border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive">
          {error}
        </p>
      ) : null}
    </div>
  );
}

function Header({
  status,
  rowCount,
}: {
  status: ToolBlockState['status'];
  rowCount?: number;
}) {
  if (status === 'error') {
    return (
      <>
        <AlertCircle className="h-4 w-4 text-destructive" />
        <span className="text-destructive">SQL tool failed</span>
      </>
    );
  }
  if (status === 'complete') {
    return (
      <>
        <CheckCircle2 className="h-4 w-4 text-emerald-500" />
        <span>Query complete</span>
        <span className="ml-auto rounded-full bg-background px-2 py-0.5 text-xs text-muted-foreground">
          {rowCount ?? 0} {rowCount === 1 ? 'row' : 'rows'}
        </span>
      </>
    );
  }
  return (
    <>
      {status === 'loading' ? (
        <Loader2 className={cn('h-4 w-4 animate-spin text-primary')} />
      ) : (
        <Database className="h-4 w-4 text-primary" />
      )}
      <span>{status === 'loading' ? 'Querying financial data…' : 'Running query'}</span>
    </>
  );
}
