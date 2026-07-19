import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';
import { UserAvatar } from '@/components/common/UserAvatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuthStore } from '@/store/authStore';

const profileSchema = z.object({
  name: z.string().max(120, 'Name is too long'),
});

type ProfileFormValues = z.infer<typeof profileSchema>;

/** "Update profile" tab: initials avatar, editable name, read-only email. */
export function ProfileForm() {
  const user = useAuthStore((s) => s.user);
  const updateProfile = useAuthStore((s) => s.updateProfile);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting, isDirty },
  } = useForm<ProfileFormValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: { name: user?.name ?? '' },
  });

  if (!user) return null;

  const onSubmit = async (values: ProfileFormValues) => {
    try {
      await updateProfile({ name: values.name.trim() });
      toast.success('Profile updated');
    } catch {
      toast.error('Couldn’t update your profile');
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <UserAvatar name={user.name} email={user.email} className="h-12 w-12 text-sm" />
        <div className="min-w-0">
          <p className="truncate text-sm font-medium">{user.name ?? 'Unnamed'}</p>
          <p className="truncate text-xs text-muted-foreground">{user.email}</p>
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
        <div className="space-y-2">
          <Label htmlFor="profile-name">Name</Label>
          <Input id="profile-name" type="text" autoComplete="name" {...register('name')} />
          {errors.name && (
            <p className="text-sm text-destructive">{errors.name.message}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="profile-email">Email</Label>
          <Input id="profile-email" type="email" value={user.email} readOnly disabled />
          <p className="text-xs text-muted-foreground">Email can’t be changed.</p>
        </div>

        <Button type="submit" disabled={isSubmitting || !isDirty}>
          {isSubmitting ? 'Saving…' : 'Save changes'}
        </Button>
      </form>
    </div>
  );
}
