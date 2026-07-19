import { create } from 'zustand';

interface StreamGuardState {
  /** True while a chat turn is streaming and its answer is not yet persisted. */
  isStreaming: boolean;
  setStreaming: (isStreaming: boolean) => void;
}

/**
 * Tracks whether a chat turn is mid-stream so navigation surfaces outside the
 * chat pane (sidebar links, "New chat") can warn before discarding it.
 */
export const useStreamGuardStore = create<StreamGuardState>((set) => ({
  isStreaming: false,
  setStreaming: (isStreaming) => set({ isStreaming }),
}));
