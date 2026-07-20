import { useRef } from 'react';
import { MessageSquare, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

interface DeleteConfirmationDialogProps {
  open: boolean;
  conversationTitle: string;
  isDeleting: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}

/**
 * Confirmation modal shown before a destructive delete. Cancel receives default
 * focus (never the destructive action); Radix handles Escape and focus trapping.
 */
export function DeleteConfirmationDialog({
  open,
  conversationTitle,
  isDeleting,
  onCancel,
  onConfirm,
}: DeleteConfirmationDialogProps) {
  const cancelRef = useRef<HTMLButtonElement>(null);

  return (
    <Dialog open={open} onOpenChange={(next) => !next && onCancel()}>
      <DialogContent
        className="w-11/12 gap-5 rounded-2xl p-6 sm:max-w-[26rem]"
        onOpenAutoFocus={(e) => {
          e.preventDefault();
          cancelRef.current?.focus();
        }}
      >
        <DialogHeader className="items-center gap-3 space-y-0 text-center sm:text-center">
          <span
            aria-hidden
            className="flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10 text-destructive"
          >
            <Trash2 className="h-5 w-5" />
          </span>
          <DialogTitle className="text-xl font-semibold tracking-tight">
            Delete this chat?
          </DialogTitle>
          <DialogDescription className="max-w-[34ch] text-[0.9375rem] leading-relaxed">
            This conversation and all its messages will be permanently deleted.
          </DialogDescription>
        </DialogHeader>

        {/*
          `min-w-0` is what makes the title truncate: this row is a grid item of
          DialogContent, and a grid item's default `min-width: auto` lets it grow
          to the title's full max-content width — the inner `truncate` then has an
          unbounded box to truncate against and never kicks in.
        */}
        <div className="flex min-w-0 items-center gap-2.5 rounded-xl border bg-muted/50 px-3.5 py-3">
          <MessageSquare
            aria-hidden
            className="h-4 w-4 shrink-0 text-muted-foreground"
          />
          <p className="min-w-0 flex-1 truncate text-sm font-medium leading-6 text-foreground">
            {conversationTitle}
          </p>
        </div>

        <DialogFooter className="gap-2 sm:gap-2">
          <Button
            ref={cancelRef}
            variant="outline"
            className="h-11 flex-1 font-medium"
            onClick={onCancel}
            disabled={isDeleting}
          >
            Cancel
          </Button>
          <Button
            variant="destructive"
            className="h-11 flex-1 font-medium"
            onClick={onConfirm}
            disabled={isDeleting}
          >
            {isDeleting ? 'Deleting…' : 'Delete'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
