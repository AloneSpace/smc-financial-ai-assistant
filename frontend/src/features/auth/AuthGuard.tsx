import type { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { PageLoader } from '@/components/common/PageLoader';
import { useAuthStore } from '@/store/authStore';

interface AuthGuardProps {
  children: ReactNode;
}

/** Gates protected routes: shows nothing while validating, then either the
 * page (authenticated) or a redirect to /login. */
export function AuthGuard({ children }: AuthGuardProps) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const isInitializing = useAuthStore((s) => s.isInitializing);

  if (isInitializing) {
    return <PageLoader label="Restoring your session…" />;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}
