import { cn } from '@/utils/cn';

interface UserAvatarProps {
  name: string | null;
  email: string;
  className?: string;
}

/** First letter of the name, falling back to the email. */
function initialsFor(name: string | null, email: string): string {
  const source = name?.trim() || email;
  return source.slice(0, 1).toUpperCase();
}

/** Circular initials avatar. No image upload — initials only. */
export function UserAvatar({ name, email, className }: UserAvatarProps) {
  return (
    <span
      aria-hidden
      className={cn(
        'flex h-9 w-9 shrink-0 select-none items-center justify-center rounded-full bg-primary text-xs font-semibold text-primary-foreground',
        className,
      )}
    >
      {initialsFor(name, email)}
    </span>
  );
}
