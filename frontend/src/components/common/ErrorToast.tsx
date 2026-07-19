import { useEffect } from 'react';
import { AlertCircle, X } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';

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
    <Alert
      variant="destructive"
      className="fixed right-4 top-4 z-50 max-w-sm border-destructive/40 bg-card pr-10 shadow-lg"
    >
      {/* Placed before the icon so the Alert's `svg~*` padding rule skips it. */}
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
      <AlertCircle className="h-4 w-4" />
      <AlertDescription>{message}</AlertDescription>
    </Alert>
  );
}
