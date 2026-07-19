import { useQuery } from '@tanstack/react-query';
import { authService } from '@/services/authService';
import type { UsageSummary } from '@/features/auth/types';

/** Current user's budget-window usage. Enabled only while the modal is open. */
export function useUsage(enabled: boolean) {
  return useQuery<UsageSummary>({
    queryKey: ['usage'],
    queryFn: () => authService.usage(),
    enabled,
    staleTime: 30_000,
  });
}
