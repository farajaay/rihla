import { create } from 'zustand';

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  isStreaming?: boolean;
}

interface ChatState {
  messages: ChatMessage[];
  isStreaming: boolean;
  streamingContent: string;
  inputValue: string;
  addMessage: (message: Omit<ChatMessage, 'id' | 'timestamp'>) => string;
  updateStreamingMessage: (id: string, content: string) => void;
  finalizeMessage: (id: string, content: string) => void;
  setIsStreaming: (value: boolean) => void;
  setInputValue: (value: string) => void;
  clearMessages: () => void;
}

function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export const useChatStore = create<ChatState>((set) => ({
  messages: [],
  isStreaming: false,
  streamingContent: '',
  inputValue: '',

  addMessage: (message) => {
    const id = generateId();
    set((state) => ({
      messages: [
        ...state.messages,
        { ...message, id, timestamp: new Date() },
      ],
    }));
    return id;
  },

  updateStreamingMessage: (id, content) => {
    set((state) => ({
      messages: state.messages.map((m) =>
        m.id === id ? { ...m, content, isStreaming: true } : m
      ),
      streamingContent: content,
    }));
  },

  finalizeMessage: (id, content) => {
    set((state) => ({
      messages: state.messages.map((m) =>
        m.id === id ? { ...m, content, isStreaming: false } : m
      ),
      streamingContent: '',
    }));
  },

  setIsStreaming: (value) => set({ isStreaming: value }),
  setInputValue: (value) => set({ inputValue: value }),
  clearMessages: () => set({ messages: [], streamingContent: '', isStreaming: false }),
}));
