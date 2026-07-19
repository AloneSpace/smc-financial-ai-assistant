import { QueryClientProvider } from '@tanstack/react-query';
import { createBrowserRouter, Navigate, RouterProvider } from 'react-router-dom';
import { AppLayout } from '@/components/layout/AppLayout';
import { AuthGuard } from '@/features/auth/AuthGuard';
import { ChatPage } from '@/pages/ChatPage';
import { LoginPage } from '@/pages/LoginPage';
import { RegisterPage } from '@/pages/RegisterPage';
import { Toaster } from '@/components/ui/sonner';
import { queryClient } from '@/services/queryClient';

/**
 * `/login` and `/register` are public. The `/chat` routes are gated by AuthGuard
 * and rendered inside AppLayout (conversation sidebar + main area).
 */
const router = createBrowserRouter([
  { path: '/', element: <Navigate to="/chat" replace /> },
  { path: '/login', element: <LoginPage /> },
  { path: '/register', element: <RegisterPage /> },
  {
    element: (
      <AuthGuard>
        <AppLayout />
      </AuthGuard>
    ),
    children: [
      { path: '/chat', element: <ChatPage /> },
      { path: '/chat/:conversationId', element: <ChatPage /> },
    ],
  },
  { path: '*', element: <Navigate to="/chat" replace /> },
]);

/** Root component: app-wide providers + the router. */
export function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
      <Toaster position="top-right" richColors />
    </QueryClientProvider>
  );
}
