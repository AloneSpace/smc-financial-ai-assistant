import { useRef } from 'react';
import { AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

interface LeaveStreamDialogProps {
  open: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}

/**
 * Shown when the user tries to leave a conversation while the assistant is
 * still streaming. Staying is the default focus — leaving loses the answer.
 */
export function LeaveStreamDialog({
  open,
  onCancel,
  onConfirm,
}: LeaveStreamDialogProps) {
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
            <AlertTriangle className="h-5 w-5" />
          </span>
          <DialogTitle className="text-xl font-semibold tracking-tight">
            Leave while the answer is generating?
          </DialogTitle>
          <DialogDescription className="max-w-[34ch] text-[0.9375rem] leading-relaxed">
            The assistant is still replying. If you leave now, the unfinished
            answer will be lost.
          </DialogDescription>
        </DialogHeader>

        <DialogFooter className="gap-2 sm:gap-2">
          <Button
            ref={cancelRef}
            variant="outline"
            className="h-11 flex-1 font-medium"
            onClick={onCancel}
          >
            Stay
          </Button>
          <Button
            variant="destructive"
            className="h-11 flex-1 font-medium"
            onClick={onConfirm}
          >
            Leave anyway
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
