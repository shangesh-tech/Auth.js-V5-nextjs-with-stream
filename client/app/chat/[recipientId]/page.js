"use client";
import React, { useEffect, useState } from 'react';
import {
  Chat,
  Channel,
  ChannelHeader,
  MessageList,
  MessageInput,
  Window,
  Thread,
} from 'stream-chat-react';
import { useStreamChatStore } from '@/stores/useStreamChatStore';
import { useSession } from 'next-auth/react';
import { useParams } from 'next/navigation';
import 'stream-chat-react/dist/css/v2/index.css';

export default function ChatPage() {
  const { chatClient, isClientReady, initChat, disconnect } = useStreamChatStore();
  const { data: session } = useSession();
  const params = useParams();
  const recipientId = params.recipientId; // Use 'id' instead of 'recipientId' to match your route [id]

  const [channel, setChannel] = useState(null);
  const [otherUser, setOtherUser] = useState(null);
  const [error, setError] = useState(null); // New: For UI error display

  useEffect(() => {
    if (!session?.user?.id) {
      setError('Please log in to chat.');
      return;
    }

    if (!isClientReady) {
      initChat();
    }

    const waitForReady = async () => {
      if (isClientReady) return true;
      return new Promise((resolve) => {
        const checkReady = setInterval(() => {
          if (isClientReady) {
            clearInterval(checkReady);
            resolve(true);
          }
        }, 200); // Check every 200ms, less aggressive than 500ms
      });
    };

    const setupChannel = async () => {
      await waitForReady(); // Wait for client ready
      if (!recipientId) {
        setError('Invalid recipient ID.');
        return;
      }

      const members = [session.user.id, recipientId].sort();
      const channelId = members.join('-');

      try {
        const newChannel = chatClient.channel('messaging', channelId, {
          members,
        });

        await newChannel.watch();
        setChannel(newChannel);
        setError(null); // Clear any previous errors

        const otherMember = Object.values(newChannel.state.members).find(
          (member) => member.user_id !== session.user.id
        );
        setOtherUser(otherMember?.user || null);
      } catch (err) {
        console.error('Failed to set up chat channel:', err);
        setError('Failed to load chat. Ensure the recipient is registered.');
      }
    };

    setupChannel();

    return () => {
      if (channel) {
        channel.stopWatching();
      }
      // Disconnect only if needed (e.g., on logout elsewhere)
    };
  }, [chatClient, isClientReady, session?.user?.id, recipientId, initChat, channel]);

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50">
        <div className="text-center p-8 bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl border border-white/20">
          <p className="text-xl font-semibold text-red-600">{error}</p>
          <p className="text-sm text-gray-500 mt-2">Try refreshing or logging in again.</p>
        </div>
      </div>
    );
  }

  if (!isClientReady || !channel) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50">
        <div className="text-center p-8 bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl border border-white/20">
          <div className="relative">
            <div className="animate-spin rounded-full h-14 w-14 border-4 border-transparent border-t-indigo-500 border-r-purple-500 mx-auto mb-6"></div>
            <div className="absolute inset-0 rounded-full h-14 w-14 border-4 border-transparent border-b-indigo-300 border-l-purple-300 mx-auto animate-spin animate-reverse"></div>
          </div>
          <p className="text-xl font-semibold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
            Connecting to chat...
          </p>
          <p className="text-sm text-gray-500 mt-2">Please wait a moment</p>
        </div>
      </div>
    );
  }

  const channelTitle = otherUser ? otherUser.name : 'Loading...';

  return (
    <div className="max-w-7xl mx-auto bg-white rounded-2xl shadow-2xl overflow-hidden flex flex-col h-[calc(90vh-2rem)] sm:h-[calc(90vh-3rem)] border border-gray-100">
      <Chat client={chatClient} theme="str-chat__theme-light">
        <Channel channel={channel}>
          <Window>
            <div className="border-b border-gray-200 bg-gradient-to-r from-indigo-50 via-white to-purple-50 p-4 sm:p-6 relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-r from-indigo-100/30 to-purple-100/30 opacity-50"></div>
              <div className="relative z-10">
                <ChannelHeader title={channelTitle} />
              </div>
              <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-indigo-200/20 to-purple-200/20 rounded-full -translate-y-16 translate-x-16"></div>
              <div className="absolute bottom-0 left-0 w-24 h-24 bg-gradient-to-tr from-purple-200/20 to-indigo-200/20 rounded-full translate-y-12 -translate-x-12"></div>
            </div>

            <div className="flex-1 overflow-y-auto bg-gradient-to-br from-gray-50/30 via-white to-indigo-50/20 relative">
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(99,102,241,0.03),transparent_50%),radial-gradient(circle_at_70%_80%,rgba(147,51,234,0.03),transparent_50%)]"></div>
              <div className="relative z-10">
                <MessageList />
              </div>
            </div>

            <div className="border-t border-gray-200 bg-gradient-to-r from-indigo-50/50 via-white to-purple-50/50 p-3 sm:p-4 relative">
              <div className="absolute inset-0 bg-gradient-to-r from-indigo-50/30 to-purple-50/30"></div>
              <div className="relative z-10">
                <MessageInput
                  additionalTextareaProps={{
                    className:
                      'border-indigo-200 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-200/50 focus:ring-opacity-75 rounded-xl transition-all duration-200 shadow-sm hover:shadow-md bg-white/80 backdrop-blur-sm',
                  }}
                />
              </div>
            </div>
          </Window>

          <Thread
            additionalMessageInputProps={{
              className:
                'border-indigo-200 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-200/50 focus:ring-opacity-75 rounded-xl transition-all duration-200 shadow-sm hover:shadow-md bg-white/80 backdrop-blur-sm',
            }}
          />
        </Channel>
      </Chat>
    </div>
  );
}
