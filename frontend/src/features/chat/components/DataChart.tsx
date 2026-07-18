import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import type { ChartConfig } from '../types';

interface DataChartProps {
  raw: string;
}

/** Brand-neutral series palette; readable in both light and dark themes. */
const SERIES_COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#0ea5e9'];

/** Compact USD formatter for axis ticks and tooltips. */
function formatUsd(value: number): string {
  const abs = Math.abs(value);
  if (abs >= 1_000_000_000) return `$${(value / 1_000_000_000).toFixed(2)}B`;
  if (abs >= 1_000_000) return `$${(value / 1_000_000).toFixed(2)}M`;
  return value.toLocaleString();
}

function parseConfig(raw: string): ChartConfig | null {
  try {
    const parsed: unknown = JSON.parse(raw);
    if (
      parsed &&
      typeof parsed === 'object' &&
      'type' in parsed &&
      'xKey' in parsed &&
      'yKey' in parsed &&
      'data' in parsed &&
      Array.isArray((parsed as ChartConfig).data)
    ) {
      return parsed as ChartConfig;
    }
  } catch {
    // fall through to null
  }
  return null;
}

/**
 * Renders a `\`\`\`chart` block from an AI answer as a Recharts bar/line chart.
 * Any malformed config falls back to showing the raw JSON, never a crash.
 */
export function DataChart({ raw }: DataChartProps) {
  const config = parseConfig(raw);
  if (!config) {
    return (
      <pre className="my-2 overflow-x-auto rounded-lg border border-border bg-muted/40 p-3 text-xs">
        <code>{raw}</code>
      </pre>
    );
  }

  const yKeys = Array.isArray(config.yKey) ? config.yKey : [config.yKey];

  return (
    <figure className="my-3 rounded-lg border border-border p-3">
      {config.title ? (
        <figcaption className="mb-2 text-sm font-medium">
          {config.title}
        </figcaption>
      ) : null}
      <div className="h-72 w-full">
        <ResponsiveContainer width="100%" height="100%">
          {config.type === 'line' ? (
            <LineChart data={config.data}>
              <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
              <XAxis dataKey={config.xKey} fontSize={12} />
              <YAxis tickFormatter={formatUsd} fontSize={12} width={70} />
              <Tooltip formatter={(v: number) => formatUsd(v)} />
              {yKeys.length > 1 ? <Legend /> : null}
              {yKeys.map((key, i) => (
                <Line
                  key={key}
                  type="monotone"
                  dataKey={key}
                  stroke={SERIES_COLORS[i % SERIES_COLORS.length]}
                  strokeWidth={2}
                  dot={false}
                />
              ))}
            </LineChart>
          ) : (
            <BarChart data={config.data}>
              <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
              <XAxis dataKey={config.xKey} fontSize={12} />
              <YAxis tickFormatter={formatUsd} fontSize={12} width={70} />
              <Tooltip formatter={(v: number) => formatUsd(v)} />
              {yKeys.length > 1 ? <Legend /> : null}
              {yKeys.map((key, i) => (
                <Bar
                  key={key}
                  dataKey={key}
                  fill={SERIES_COLORS[i % SERIES_COLORS.length]}
                  radius={[4, 4, 0, 0]}
                />
              ))}
            </BarChart>
          )}
        </ResponsiveContainer>
      </div>
    </figure>
  );
}
