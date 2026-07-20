import { cn } from '@/utils/cn';

interface BrandLockupProps {
  className?: string;
}

/**
 * The FinChat brand lockup: gradient app mark (a chat bubble holding a rising
 * bar chart) beside the wordmark. Used at the top of the auth card so the
 * product is named before the form.
 */
export function BrandLockup({ className }: BrandLockupProps) {
  return (
    <span className={cn('flex items-center gap-2.5', className)}>
      <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 via-violet-600 to-indigo-700 shadow-lg shadow-indigo-500/30">
        <svg
          viewBox="0 0 24 24"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          aria-hidden="true"
          className="h-6 w-6"
        >
          {/* Chat bubble */}
          <path
            d="M4.5 6.5A2.5 2.5 0 0 1 7 4h10a2.5 2.5 0 0 1 2.5 2.5v7A2.5 2.5 0 0 1 17 16h-5.4L7.5 19.2V16A2.5 2.5 0 0 1 4.5 13.5v-7Z"
            fill="#fff"
            fillOpacity="0.2"
            stroke="#fff"
            strokeWidth="1.3"
            strokeLinejoin="round"
          />
          {/* Rising bars, baseline-aligned inside the bubble */}
          <g fill="#fff">
            <rect x="7.5" y="11" width="2.2" height="3.5" rx="1.1" />
            <rect x="10.9" y="9" width="2.2" height="5.5" rx="1.1" />
            <rect x="14.3" y="6.9" width="2.2" height="7.6" rx="1.1" />
          </g>
        </svg>
      </span>

      <span className="text-xl font-semibold tracking-tight text-card-foreground">
        Fin
        <span className="bg-gradient-to-r from-indigo-500 to-violet-600 bg-clip-text text-transparent dark:from-indigo-300 dark:to-violet-300">
          Chat
        </span>
      </span>
    </span>
  );
}
