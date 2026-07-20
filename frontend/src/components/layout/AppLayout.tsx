import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { ConversationSidebar } from '@/features/conversations/components/ConversationSidebar';

/** Two-pane authenticated shell: conversation sidebar + routed main area.
 *  On mobile the sidebar collapses into a slide-in drawer; on md+ it is a
 *  static column. Routed pages own their own header via the context toggle. */
export function AppLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="flex h-[100dvh] overflow-hidden">
      {/* Backdrop — mobile only, closes the drawer on tap. */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/50 md:hidden"
          aria-hidden
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <ConversationSidebar
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />

      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <main className="min-h-0 flex-1 overflow-hidden">
          <Outlet context={{ openSidebar: () => setSidebarOpen(true) }} />
        </main>
      </div>
    </div>
  );
}
