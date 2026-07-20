import { useEffect, useRef } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { ErrorToast } from '@/components/common/ErrorToast';
import { useAppLayout } from '@/components/layout/useAppLayout';
import { useConversation } from '@/features/conversations/hooks/useConversation';
import type { Message } from '@/features/conversations/types';
import { useCreateConversation } from '@/features/conversations/hooks/useConversations';
import { useChat } from '@/features/chat/hooks/useChat';
import { ChatHeader } from '@/features/chat/components/ChatHeader';
import { ChatInput } from '@/features/chat/components/ChatInput';
import { MessageList } from '@/features/chat/components/MessageList';
import { MessageSkeleton } from '@/features/chat/components/MessageSkeleton';
import { EmptyConversationState } from '@/features/chat/components/EmptyConversationState';
import { UsageLimitBanner } from '@/features/chat/components/UsageLimitBanner';

interface LocationState {
  initialMessage?: string;
}

/**
 * The chat main pane. Loads a conversation's history, renders the live stream,
 * and handles the "new chat" flow (create → navigate → auto-send first message).
 */
export function ChatPage() {
  const { conversationId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { openSidebar } = useAppLayout();
  const createConversation = useCreateConversation();

  const conversationQuery = useConversation(conversationId);
  const chat = useChat(conversationId);

  const initialMessage = (location.state as LocationState | null)?.initialMessage;
  const initialSentRef = useRef<string | null>(null);

  // Auto-send the message that started a brand-new conversation.
  useEffect(() => {
    if (
      conversationId &&
      initialMessage &&
      initialSentRef.current !== conversationId
    ) {
      initialSentRef.current = conversationId;
      chat.send(initialMessage);
      navigate(location.pathname, { replace: true, state: {} });
    }
  }, [conversationId, initialMessage, chat, navigate, location.pathname]);

  const handleSend = async (message: string) => {
    if (conversationId) {
      chat.send(message);
      return;
    }
    const conversation = await createConversation.mutateAsync(undefined);
    navigate(`/chat/${conversation.id}`, { state: { initialMessage: message } });
  };

  // The backend persists the user message before it starts streaming, so a
  // history refetch that lands mid-turn would render that row *and* the
  // optimistic `pendingUserMessage` — the same text twice. Pin the history to
  // what it was when the turn started; `finalize` swaps in the persisted rows
  // and releases the pin in one commit.
  const frozenMessagesRef = useRef<Message[] | null>(null);
  const liveMessages = conversationQuery.data?.messages ?? [];
  if (!chat.isTurnActive) {
    frozenMessagesRef.current = null;
  } else if (frozenMessagesRef.current === null) {
    frozenMessagesRef.current = liveMessages;
  }
  const messages = frozenMessagesRef.current ?? liveMessages;

  const hasContent =
    messages.length > 0 ||
    chat.pendingUserMessage !== null ||
    chat.isStreaming ||
    chat.streamState === 'ERROR';

  return (
    <div className="flex h-full flex-col">
      <ChatHeader
        title={conversationQuery.data?.title}
        conversationId={conversationId}
        onOpenSidebar={openSidebar}
      />

      {conversationId && conversationQuery.isLoading && !chat.isTurnActive ? (
        <div className="flex-1 overflow-y-auto">
          <MessageSkeleton />
        </div>
      ) : conversationId && conversationQuery.isError && !chat.isTurnActive ? (
        <div className="flex flex-1 items-center justify-center p-8 text-center text-sm text-muted-foreground">
          Couldn’t load this conversation. Please try again.
        </div>
      ) : hasContent ? (
        <MessageList
          messages={messages}
          pendingUserMessage={chat.pendingUserMessage}
          toolBlock={chat.toolBlock}
          streamingContent={chat.streamingContent}
          streamState={chat.streamState}
        />
      ) : (
        <div className="flex-1 overflow-y-auto">
          <EmptyConversationState onSelect={handleSend} />
        </div>
      )}

      {chat.usageLimit ? (
        <UsageLimitBanner
          resetIn={chat.usageLimit.resetIn}
          message={chat.usageLimit.message}
          onExpire={chat.clearUsageLimit}
        />
      ) : null}

      {chat.error ? (
        <ErrorToast message={chat.error} onDismiss={chat.dismissError} />
      ) : null}

      <ChatInput
        onSend={handleSend}
        onStop={chat.stop}
        isStreaming={chat.isStreaming}
        disabled={chat.usageLimit !== null}
        focusKey={conversationId ?? 'new'}
      />
    </div>
  );
}
