import { useParams } from 'react-router-dom';

/**
 * Main chat area. Phase 3 adds the message list and input; for now it reflects
 * whether a conversation is selected so the sidebar wiring is verifiable.
 */
export function ChatPage() {
  const { conversationId } = useParams();

  return (
    <div className="flex h-full flex-col items-center justify-center gap-2 p-8 text-center">
      <h1 className="text-xl font-semibold tracking-tight">FinChat</h1>
      {conversationId ? (
        <p className="text-sm text-muted-foreground">
          Conversation <span className="font-mono">{conversationId}</span> — messages
          arrive in Phase 3.
        </p>
      ) : (
        <p className="text-sm text-muted-foreground">
          Select a conversation or start a new chat.
        </p>
      )}
    </div>
  );
}
