import { zodResolver } from '@hookform/resolvers/zod';
import axios from 'axios';
import { Loader2 } from 'lucide-react';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { AuthCard } from '@/components/layout/AuthCard';
import { PageLoader } from '@/components/common/PageLoader';
import { PasswordInput } from '@/components/common/PasswordInput';
import { useAuthStore } from '@/store/authStore';

const registerSchema = z.object({
  name: z.string().max(120, 'Name is too long').optional(),
  email: z.string().email('Enter a valid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  confirmPassword: z.string().min(8, 'Confirm Password must be at least 8 characters'),
});

type RegisterForm = z.infer<typeof registerSchema>;

export function RegisterPage() {
  const registerAccount = useAuthStore((s) => s.register);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const isInitializing = useAuthStore((s) => s.isInitializing);
  const navigate = useNavigate();
  const [formError, setFormError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<RegisterForm>({ resolver: zodResolver(registerSchema) });

  // Hold the loader until the persisted token has been checked, so a returning
  // user is never flashed the sign-up form before being redirected.
  if (isInitializing) {
    return <PageLoader label="Restoring your session…" />;
  }

  if (isAuthenticated) {
    return <Navigate to="/chat" replace />;
  }

  const onSubmit = async (values: RegisterForm) => {
    setFormError(null);
    try {
      await registerAccount(values);
      navigate('/chat', { replace: true });
    } catch (err) {
      if (axios.isAxiosError(err) && err.response?.status === 409) {
        setFormError('An account with this email already exists');
      } else {
        setFormError('Something went wrong. Please try again.');
      }
    }
  };

  return (
    <AuthCard
      title="Create your account"
      subtitle="Start asking questions about company financials"
      footer={
        <>
          Already have an account?{' '}
          <Link
            to="/login"
            className="font-medium text-primary transition-colors hover:text-primary/80 hover:underline"
          >
            Sign in
          </Link>
        </>
      }
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5" noValidate>
        <div className="animate-fade-up space-y-2" style={{ animationDelay: '80ms' }}>
          <Label htmlFor="name">Name</Label>
          <Input
            id="name"
            type="text"
            autoComplete="name"
            placeholder="Optional"
            {...register('name')}
          />
          {errors.name && (
            <p className="text-sm text-destructive">{errors.name.message}</p>
          )}
        </div>

        <div className="animate-fade-up space-y-2" style={{ animationDelay: '140ms' }}>
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            autoComplete="email"
            placeholder="Enter Email"
            {...register('email')}
          />
          {errors.email && (
            <p className="text-sm text-destructive">{errors.email.message}</p>
          )}
        </div>

        <div className="animate-fade-up space-y-2" style={{ animationDelay: '200ms' }}>
          <Label htmlFor="password">Password</Label>
          <PasswordInput
            id="password"
            autoComplete="new-password"
            placeholder="Enter Password"
            {...register('password')}
          />
          {errors.password && (
            <p className="text-sm text-destructive">{errors.password.message}</p>
          )}
        </div>

        <div className="animate-fade-up space-y-2" style={{ animationDelay: '260ms' }}>
          <Label htmlFor="confirmPassword">Confirm Password</Label>
          <PasswordInput
            id="confirmPassword"
            autoComplete="new-password"
            placeholder="Confirm Password"
            {...register('confirmPassword')}
          />
          {errors.confirmPassword && (
            <p className="text-sm text-destructive">{errors.confirmPassword.message}</p>
          )}
        </div>

        {formError && (
          <p className="animate-fade-up rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {formError}
          </p>
        )}

        <div className="animate-fade-up" style={{ animationDelay: '320ms' }}>
          <Button
            type="submit"
            className="w-full text-white"
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                Creating account…
              </>
            ) : (
              'Create account'
            )}
          </Button>
        </div>
      </form>
    </AuthCard>
  );
}
