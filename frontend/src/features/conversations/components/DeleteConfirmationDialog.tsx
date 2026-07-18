import { useEffect, useRef } from 'react';
import { Button } from '@/shared/components/ui/button';

interface DeleteConfirmationDialogProps {
  open: boolean;
  conversationTitle: string;
  isDeleting: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}

/**
 * Lightweight confirmation modal shown before a destructive delete. Cancel
 * receives default focus (never the destructive action); Escape cancels.
 */
export function DeleteConfirmationDialog({
  open,
  conversationTitle,
  isDeleting,
  onCancel,
  onConfirm,
}: DeleteConfirmationDialogProps) {
  const cancelRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    cancelRef.current?.focus();
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCancel();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [open, onCancel]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="delete-dialog-title"
      onMouseDown={onCancel}
    >
      <div
        className="w-full max-w-sm rounded-lg border bg-card p-6 text-card-foreground shadow-lg"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <h2 id="delete-dialog-title" className="text-lg font-semibold">
          Delete conversation
        </h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Delete{' '}
          <span className="font-medium text-foreground">“{conversationTitle}”</span>?
          This cannot be undone.
        </p>
        <div className="mt-6 flex justify-end gap-2">
          <Button ref={cancelRef} variant="outline" onClick={onCancel} disabled={isDeleting}>
            Cancel
          </Button>
          <Button variant="destructive" onClick={onConfirm} disabled={isDeleting}>
            {isDeleting ? 'Deleting…' : 'Delete'}
          </Button>
        </div>
      </div>
    </div>
  );
}
