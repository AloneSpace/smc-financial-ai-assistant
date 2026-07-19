import { Pencil } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';

interface RenameDialogProps {
  open: boolean;
  initialTitle: string;
  isSaving: boolean;
  onCancel: () => void;
  onSave: (title: string) => void;
}

/** Modal for renaming a conversation. Used on mobile where inline
 *  double-click editing isn't practical. */
export function RenameDialog({
  open,
  initialTitle,
  isSaving,
  onCancel,
  onSave,
}: RenameDialogProps) {
  const [draft, setDraft] = useState(initialTitle);
  const inputRef = useRef<HTMLInputElement>(null);

  // Reset the draft whenever the dialog opens for a (possibly new) title.
  useEffect(() => {
    if (open) setDraft(initialTitle);
  }, [open, initialTitle]);

  const trimmed = draft.trim();
  const canSave = trimmed.length > 0 && trimmed !== initialTitle && !isSaving;

  return (
    <Dialog open={open} onOpenChange={(next) => !next && onCancel()}>
      <DialogContent
        className="w-11/12 sm:max-w-md rounded-2xl"
        onOpenAutoFocus={(e) => {
          e.preventDefault();
          inputRef.current?.focus();
          inputRef.current?.select();
        }}
      >
        <DialogHeader className="items-center text-center sm:text-center">
          <span
            aria-hidden
            className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary ring-8 ring-primary/5"
          >
            <Pencil className="h-5 w-5" />
          </span>
          <DialogTitle className="pt-1">Rename chat</DialogTitle>
          <DialogDescription>Give this conversation a new name.</DialogDescription>
        </DialogHeader>

        <Input
          ref={inputRef}
          value={draft}
          maxLength={255}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && canSave) {
              e.preventDefault();
              onSave(trimmed);
            }
          }}
          aria-label="Conversation title"
        />

        <DialogFooter className="gap-2 sm:gap-2">
          <Button
            variant="outline"
            className="flex-1"
            onClick={onCancel}
            disabled={isSaving}
          >
            Cancel
          </Button>
          <Button
            className="flex-1 text-white"
            onClick={() => onSave(trimmed)}
            disabled={!canSave}
          >
            {isSaving ? 'Saving…' : 'Save'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
