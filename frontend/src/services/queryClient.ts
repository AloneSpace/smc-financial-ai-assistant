import { QueryClient } from '@tanstack/react-query';

/** Shared TanStack Query client. Server state lives here — never in useState. */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
      staleTime: 30_000,
    },
  },
});
