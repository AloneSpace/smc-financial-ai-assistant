import { QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { AuthProvider } from '@/features/auth/AuthContext';
import { queryClient } from '@/shared/lib/queryClient';

interface ProvidersProps {
  children: ReactNode;
}

/** App-wide providers. Toaster is added in a later phase. */
export function Providers({ children }: ProvidersProps) {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>{children}</AuthProvider>
    </QueryClientProvider>
  );
}
