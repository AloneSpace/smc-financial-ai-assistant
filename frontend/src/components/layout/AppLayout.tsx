import { Outlet } from 'react-router-dom';
import { ConversationSidebar } from '@/features/conversations/components/ConversationSidebar';

/** Two-pane authenticated shell: conversation sidebar + routed main area. */
export function AppLayout() {
  return (
    <div className="flex h-screen overflow-hidden">
      <ConversationSidebar />
      <main className="flex-1 overflow-hidden">
        <Outlet />
      </main>
    </div>
  );
}
