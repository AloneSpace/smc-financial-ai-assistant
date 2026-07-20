import type { ReactNode } from 'react';
import { AuthIllustration } from '@/components/common/AuthIllustration';
import { BrandLockup } from '@/components/common/BrandLockup';

interface AuthCardProps {
  title: string;
  subtitle: string;
  children: ReactNode;
  footer: ReactNode;
}

/**
 * Split-panel shell for the Login and Register screens: vector artwork on the
 * left, form on the right. Below `lg` the artwork collapses to a compact banner
 * above the form so the fields stay above the fold on mobile.
 */
export function AuthCard({ title, subtitle, children, footer }: AuthCardProps) {
  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-gradient-to-br from-indigo-100 via-violet-100 to-rose-100 p-4 dark:from-slate-950 dark:via-indigo-950 dark:to-slate-900 sm:p-8">
      {/* Ambient background blobs */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -left-24 -top-24 h-80 w-80 rounded-full bg-violet-400/30 blur-3xl dark:bg-violet-600/20"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -bottom-32 -right-20 h-96 w-96 rounded-full bg-rose-300/40 blur-3xl dark:bg-indigo-700/20"
      />

      <div className="relative grid w-full max-w-5xl animate-fade-up overflow-hidden rounded-3xl border border-white/40 bg-card/80 shadow-2xl shadow-indigo-900/10 backdrop-blur-xl dark:border-white/10 dark:shadow-black/40 lg:grid-cols-2">
        {/* Form panel */}
        <div className="flex flex-col justify-center px-6 py-10 sm:px-12 lg:order-2">
          {/* Names the product before the form. Centred on narrow viewports to
              sit with the compact artwork; left-aligned beside the heading on lg. */}
          <BrandLockup className="mb-7 justify-center lg:justify-start" />

          {/* Compact artwork for narrow viewports */}
          <div className="mx-auto mb-6 h-32 w-32 lg:hidden">
            <AuthIllustration />
          </div>

          <div className="mb-8">
            <h1 className="text-2xl font-semibold tracking-tight text-card-foreground sm:text-3xl">
              {title}
            </h1>
            <p className="mt-2 text-sm text-muted-foreground">{subtitle}</p>
          </div>

          {children}

          <p className="mt-8 text-sm text-muted-foreground">{footer}</p>
        </div>

        {/* Artwork panel */}
        <div className="relative hidden items-center justify-center overflow-hidden bg-gradient-to-br from-indigo-500 via-violet-600 to-indigo-800 p-10 lg:order-1 lg:flex">
          <div className="relative z-10 flex w-full max-w-sm flex-col items-center text-center">
            <AuthIllustration className="drop-shadow-2xl" />
            <h2 className="mt-6 text-xl font-semibold text-white">
              Financial answers, grounded in real data
            </h2>
            <p className="mt-2 text-sm text-indigo-100">
              Ask about revenue, margins, and growth for US public companies — every
              figure comes straight from the database.
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}
