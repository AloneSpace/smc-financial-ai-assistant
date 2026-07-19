import { isValidElement, type ReactNode } from 'react';
import ReactMarkdown, { type Components } from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { cn } from '@/utils/cn';
import { DataTable } from './DataTable';
import { DataChart } from './DataChart';

interface MarkdownRendererProps {
  content: string;
}

/** Pulls the `className` + text out of a `<pre>`'s inner `<code>` element. */
function readCodeChild(children: ReactNode): {
  className: string;
  text: string;
} {
  const child = Array.isArray(children) ? children[0] : children;
  if (isValidElement<{ className?: string; children?: ReactNode }>(child)) {
    return {
      className: child.props.className ?? '',
      text: String(child.props.children ?? ''),
    };
  }
  return { className: '', text: String(children ?? '') };
}

const components: Components = {
  // `pre` owns block-level code: intercept ```chart blocks for DataChart.
  pre({ children }) {
    const { className, text } = readCodeChild(children);
    if (/language-chart/.test(className)) {
      return <DataChart raw={text} />;
    }
    return (
      <pre className="my-2 overflow-x-auto rounded-lg border border-border bg-muted/40 p-3 text-xs">
        {children}
      </pre>
    );
  },
  code({ className, children }) {
    const isBlock =
      /language-/.test(className ?? '') || String(children).includes('\n');
    if (isBlock) {
      return <code className={className}>{children}</code>;
    }
    return (
      <code className="rounded bg-muted px-1 py-0.5 font-mono text-[0.85em]">
        {children}
      </code>
    );
  },
  table: ({ children }) => <DataTable>{children}</DataTable>,
  a: ({ href, children }) => (
    <a href={href} target="_blank" rel="noreferrer noopener">
      {children}
    </a>
  ),
};

/**
 * Renders assistant Markdown safely (no raw HTML) with GFM tables and inline
 * `\`\`\`chart` charts. Styling is applied via descendant utilities so we don't
 * depend on a typography plugin.
 */
export function MarkdownRenderer({ content }: MarkdownRendererProps) {
  return (
    <div
      className={cn(
        'text-sm leading-relaxed',
        '[&>*:first-child]:mt-0 [&>*:last-child]:mb-0',
        '[&_p]:my-2 [&_li]:my-0.5',
        '[&_ul]:my-2 [&_ul]:list-disc [&_ul]:pl-5',
        '[&_ol]:my-2 [&_ol]:list-decimal [&_ol]:pl-5',
        '[&_h1]:mb-2 [&_h1]:mt-4 [&_h1]:text-lg [&_h1]:font-semibold',
        '[&_h2]:mb-2 [&_h2]:mt-3 [&_h2]:text-base [&_h2]:font-semibold',
        '[&_h3]:mt-3 [&_h3]:font-semibold',
        '[&_strong]:font-semibold [&_a]:text-primary [&_a]:underline',
        '[&_blockquote]:border-l-2 [&_blockquote]:border-border [&_blockquote]:pl-3 [&_blockquote]:text-muted-foreground',
      )}
    >
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={components}>
        {content}
      </ReactMarkdown>
    </div>
  );
}
