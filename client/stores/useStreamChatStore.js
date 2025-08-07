"use client";
import { create } from 'zustand';
import { StreamChat } from 'stream-chat';

export const useStreamChatStore = create((set, get) => ({
  chatClient: null,
  isClientReady: false,
  isConnecting: false,
  initChat: async () => {
    const { isConnecting, chatClient, isClientReady } = get();
    if (isConnecting || isClientReady || chatClient) {
      console.log('Chat client already initialized or connecting—skipping.');
      return;
    }

    set({ isConnecting: true });

    try {
      const response = await fetch('/api/stream/token', { method: 'POST' });
      if (!response.ok) throw new Error(`Token fetch failed: ${response.statusText}`);

      const { token, apiKey, userId } = await response.json();

      const client = StreamChat.getInstance(apiKey);
      await client.connectUser({ id: userId }, token);

      set({ chatClient: client, isClientReady: true });
      console.log('Stream Chat initialized successfully.');
    } catch (error) {
      console.error('Failed to initialize Stream Chat:', error);
      set({ isClientReady: false });
    } finally {
      set({ isConnecting: false });
    }
  },
  disconnect: () => {
    const { chatClient } = get();
    if (chatClient) {
      chatClient.disconnectUser();
      set({ chatClient: null, isClientReady: false, isConnecting: false });
      console.log('Stream Chat disconnected.');
    }
  },
}));
