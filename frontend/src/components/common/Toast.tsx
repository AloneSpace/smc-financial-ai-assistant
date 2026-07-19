import { useEffect } from 'react';
import { AlertCircle, CheckCircle2, Info, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/utils/cn';

export type ToastVariant = 'success' | 'error' | 'info';

interface ToastProps {
  message: string;
  variant?: ToastVariant;
  onDismiss: () => void;
  /** Auto-dismiss delay in ms. Defaults to 5s. */
  duration?: number;
}

const VARIANT_STYLES: Record<
  ToastVariant,
  { icon: typeof AlertCircle; iconClass: string; accent: string }
> = {
  success: {
    icon: CheckCircle2,
    iconClass: 'text-emerald-500',
    accent: 'before:bg-emerald-500',
  },
  error: {
    icon: AlertCircle,
    iconClass: 'text-destructive',
    accent: 'before:bg-destructive',
  },
  info: {
    icon: Info,
    iconClass: 'text-primary',
    accent: 'before:bg-primary',
  },
};

/**
 * Top-right transient notification with a coloured accent bar and per-variant
 * icon. Auto-dismisses after `duration`; also manually dismissable.
 */
export function Toast({
  message,
  variant = 'info',
  onDismiss,
  duration = 5000,
}: ToastProps) {
  useEffect(() => {
    const timer = window.setTimeout(onDismiss, duration);
    return () => window.clearTimeout(timer);
  }, [onDismiss, duration]);

  const { icon: Icon, iconClass, accent } = VARIANT_STYLES[variant];

  return (
    <div
      role="alert"
      className={cn(
        'fixed right-4 top-4 z-50 flex w-full max-w-sm items-start gap-3 overflow-hidden rounded-lg border bg-card py-3 pl-4 pr-10 text-sm text-card-foreground shadow-lg',
        'animate-in slide-in-from-top-2 fade-in-0 duration-200',
        'before:absolute before:inset-y-0 before:left-0 before:w-1',
        accent,
      )}
    >
      <Icon className={cn('mt-0.5 h-5 w-5 shrink-0', iconClass)} />
      <p className="min-w-0 flex-1 break-words leading-relaxed">{message}</p>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        onClick={onDismiss}
        aria-label="Dismiss"
        className="absolute right-1 top-1 h-7 w-7 text-muted-foreground"
      >
        <X className="h-4 w-4" />
      </Button>
    </div>
  );
}
