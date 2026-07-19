import { Info, LogOut, User as UserIcon, Wallet } from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { cn } from '@/utils/cn';
import { useAuthStore } from '@/store/authStore';
import { AboutPanel } from './AboutPanel';
import { ProfileForm } from './ProfileForm';
import { UsagePanel } from './UsagePanel';

interface ProfileModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

type Tab = 'profile' | 'usage' | 'about';

const TABS: { id: Tab; label: string; icon: typeof UserIcon }[] = [
  { id: 'profile', label: 'Profile', icon: UserIcon },
  { id: 'usage', label: 'Usage', icon: Wallet },
  { id: 'about', label: 'About', icon: Info },
];

/** Account modal with Profile (edit), Usage, and About tabs. */
export function ProfileModal({ open, onOpenChange }: ProfileModalProps) {
  const [tab, setTab] = useState<Tab>('profile');
  const logout = useAuthStore((s) => s.logout);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Account</DialogTitle>
        </DialogHeader>

        <div className="flex gap-1 rounded-lg bg-muted p-1">
          {TABS.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              type="button"
              onClick={() => setTab(id)}
              className={cn(
                'flex flex-1 items-center justify-center gap-1.5 rounded-md px-2 py-1.5 text-sm font-medium transition-colors',
                tab === id
                  ? 'bg-background text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground',
              )}
            >
              <Icon className="h-4 w-4" />
              {label}
            </button>
          ))}
        </div>

        <div className="min-h-[16rem] py-1">
          {tab === 'profile' && <ProfileForm />}
          {tab === 'usage' && <UsagePanel active={open && tab === 'usage'} />}
          {tab === 'about' && <AboutPanel />}
        </div>

        <div className="border-t pt-3">
          <Button
            variant="ghost"
            className="w-full justify-start text-muted-foreground"
            onClick={logout}
          >
            <LogOut className="h-4 w-4" />
            Log out
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
