import { createBrowserRouter, Navigate } from 'react-router-dom';
import { AuthGuard } from '@/features/auth/AuthGuard';
import { LoginPage } from '@/features/auth/components/LoginPage';
import { RegisterPage } from '@/features/auth/components/RegisterPage';
import { ChatPage } from '@/features/chat/components/ChatPage';
import { AppLayout } from '@/shared/components/AppLayout';

/**
 * `/login` and `/register` are public. The `/chat` routes are gated by AuthGuard
 * and rendered inside AppLayout (conversation sidebar + main area). The message
 * list and chat input arrive in Phase 3.
 */
export const router = createBrowserRouter([
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
