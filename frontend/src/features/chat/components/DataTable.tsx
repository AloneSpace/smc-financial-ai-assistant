import type { ReactNode } from 'react';

interface DataTableProps {
  children?: ReactNode;
}

/**
 * Styled wrapper for Markdown (GFM) tables in AI answers: zebra striping,
 * tinted header, and horizontal scroll on overflow.
 */
export function DataTable({ children }: DataTableProps) {
  return (
    <div className="my-3 overflow-x-auto rounded-lg border border-border">
      <table className="w-full border-collapse text-sm [&_td]:px-3 [&_td]:py-2 [&_th]:px-3 [&_th]:py-2 [&_th]:text-left [&_th]:font-semibold [&_thead]:bg-muted/60 [&_tbody_tr:nth-child(even)]:bg-muted/30 [&_td]:border-t [&_td]:border-border/60">
        {children}
      </table>
    </div>
  );
}
