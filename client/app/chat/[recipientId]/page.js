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
import { useParams, useRouter } from 'next/navigation';
import 'stream-chat-react/dist/css/v2/index.css';

const SidebarAvatar = ({ img, name }) =>
  img ? (
    <img
      src={img}
      alt={name}
      className="w-12 h-12 rounded-full object-cover border-2 border-indigo-200 shadow-sm group-hover:scale-105 transition-transform"
    />
  ) : (
    <svg className="w-12 h-12 rounded-full" viewBox="0 0 40 40">
      <defs>
        <radialGradient id="grad" cx="50%" cy="50%" r="70%">
          <stop offset="0%" stopColor="#6366f1" />
          <stop offset="100%" stopColor="#a78bfa" />
        </radialGradient>
      </defs>
      <circle cx="20" cy="20" r="20" fill="url(#grad)" />
    </svg>
  );

export default function ChatPage() {
  const { chatClient, isClientReady, initChat } = useStreamChatStore();
  const { data: session } = useSession();
  const router = useRouter();
  const params = useParams();
  const recipientId = params.recipientId;

  const [channel, setChannel] = useState(null);
  const [otherUser, setOtherUser] = useState(null);
  const [error, setError] = useState(null);
  const [users, setUsers] = useState([]);
  const [usersLoading, setUsersLoading] = useState(true);
  const [usersError, setUsersError] = useState(null);
  const [search, setSearch] = useState("");

  // Fetch users for sidebar
  useEffect(() => {
    const fetchUsers = async () => {
      setUsersLoading(true);
      try {
        const res = await fetch("/api/users");
        if (!res.ok) throw new Error("Can't load users");
        const { users } = await res.json();
        setUsers(users);
      } catch {
        setUsersError("Could not load users.");
      } finally {
        setUsersLoading(false);
      }
    };
    if (session?.user?.id) fetchUsers();
  }, [session?.user?.id]);

  // Chat/channel setup
  useEffect(() => {
    if (!session?.user?.id) {
      setError("Please log in to chat.");
      return;
    }
    if (!isClientReady) initChat();

    const waitForReady = async () => {
      if (isClientReady) return true;
      return new Promise(resolve => {
        const checkReady = setInterval(() => {
          if (isClientReady) { clearInterval(checkReady); resolve(true); }
        }, 100);
      });
    };

    const setupChannel = async () => {
      await waitForReady();
      if (!recipientId) {
        setError("Invalid recipient ID.");
        return;
      }
      const members = [session.user.id, recipientId].sort();
      const channelId = members.join("-");
      try {
        const newChannel = chatClient.channel("messaging", channelId, { members });
        await newChannel.watch();
        setChannel(newChannel);
        setError(null);
        const otherMember = Object.values(newChannel.state.members)
          .find(m => m.user_id !== session.user.id);
        setOtherUser(otherMember?.user || null);
      } catch (err) {
        setError("Failed to load chat. Ensure the recipient is registered.");
      }
    };
    setupChannel();
    return () => { if (channel) channel.stopWatching(); };
  }, [chatClient, isClientReady, session?.user?.id, recipientId, initChat]);

  // Sidebar navigation
  const handleUserClick = userId => router.push(`/chat/${userId}`);

  // Filter users by name/email
  const filteredUsers = users.filter(
    u =>
      u.firstName?.toLowerCase().includes(search.toLowerCase()) ||
      u.lastName?.toLowerCase().includes(search.toLowerCase()) ||
      u.email?.toLowerCase().includes(search.toLowerCase())
  );

  if (!isClientReady || !channel)
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50">
        <div className="p-8 text-center rounded-2xl shadow-xl bg-white/80 border border-white/20">
          <p className="text-xl font-semibold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
            Connecting to chat...
          </p>
          <p className="text-sm text-gray-500 mt-2">Please wait a moment</p>
        </div>
      </div>
    );

  const channelTitle = otherUser ? otherUser.name : "Loading...";

  return (
    <div className="flex h-screen overscroll-none bg-gradient-to-br from-indigo-50 via-white to-purple-50">
      {/* SIDEBAR */}
      <aside className="hidden md:flex flex-col w-[320px] border-r border-gray-200 bg-white shadow-xl h-full">
        <div className="px-6 pt-6 pb-2 border-b flex flex-col gap-3 bg-gradient-to-r from-indigo-100 via-white to-purple-100">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-extrabold text-gray-800 tracking-tight">Members</h2>
            <button
              className="text-indigo-600 hover:text-indigo-900 px-2 py-1 rounded transition font-medium"
              title="Refresh users"
              onClick={() => window.location.reload()}
            >
              ⟳
            </button>
          </div>
          {/* Improved Search Bar */}
          <div className="relative">
            <span className="absolute left-3 top-2.5 text-indigo-400 pointer-events-none">
              <svg width="20" height="20" fill="currentColor" viewBox="0 0 20 20"><path d="M12.9 14.32a7 7 0 1 1 1.41-1.41l5 4.98-1.42 1.42-4.99-5zM8 14a6 6 0 1 0 0-12 6 6 0 0 0 0 12z"/></svg>
            </span>
            <input
              type="search"
              className="text-black pl-10 pr-4 py-2 w-full rounded-full text-base border-2 border-indigo-100 focus:ring-2 focus:ring-indigo-300 transition-all outline-none bg-white shadow-sm"
              placeholder="Search users by name or email"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
        </div>
        {/* User List */}
        <ul className="flex-1 overflow-y-auto py-4 space-y-2 custom-scrollbar">
          {/* Skeleton loading */}
          {usersLoading && (
            <div className="space-y-3 px-5 py-7 animate-pulse">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="flex items-center gap-4">
                  <SidebarAvatar />
                  <div>
                    <div className="w-24 h-3 rounded bg-indigo-100 mb-1" />
                    <div className="w-12 h-2 rounded bg-purple-100" />
                  </div>
                </div>
              ))}
            </div>
          )}
          {/* Error */}
          {usersError && (
            <li className="py-4 text-center text-red-600 text-sm">{usersError}</li>
          )}
          {/* Empty */}
          {!usersLoading && !usersError && filteredUsers.length === 0 && (
            <li className="py-4 text-center text-gray-400 text-sm">No users found.</li>
          )}
          {/* Actual users */}
          {!usersLoading && !usersError &&
            filteredUsers.map(user => (
              <li
                key={user._id}
                onClick={() => handleUserClick(user._id)}
                className={`flex items-center px-5 py-4 mx-2 rounded-xl cursor-pointer group transition-all duration-150
                  ${recipientId === user._id
                    ? "bg-gradient-to-r from-indigo-100 via-white to-purple-100 shadow-lg border border-indigo-200"
                    : "hover:bg-indigo-50/60 hover:shadow-md"
                  }`}
                aria-current={recipientId === user._id}
                tabIndex={0}
                style={{outline: recipientId === user._id ? "2px solid #6366f1" : "none"}}
              >
                <SidebarAvatar img={user.image} name={user.firstName} />
                <div className="flex flex-col ml-3 flex-grow truncate">
                  <div className="flex items-center gap-1">
                    <span className="font-semibold text-gray-800 group-hover:text-indigo-700 truncate">
                      {user.firstName} {user.lastName}
                    </span>
                  </div>
                  <span className="text-xs text-gray-500 truncate">{user.email}</span>
                </div>
              </li>
            ))}
        </ul>
        {/* Footer: User count only, NO button */}
        <div className="px-6 py-4 border-t bg-gradient-to-r from-indigo-50 via-white to-purple-50/70 flex items-center justify-end">
          <div className="text-indigo-500 text-sm font-medium tracking-wide">
            Users: {users.length}
          </div>
        </div>
      </aside>
      {/* CHAT PANEL */}
      <main className="flex-1 flex flex-col h-full overflow-hidden">
        <div className="h-full w-full flex flex-col">
          <Chat client={chatClient} theme="str-chat__theme-light">
            <Channel channel={channel}>
              <Window>
                <div className="border-b bg-gradient-to-r from-indigo-100/30 via-white to-purple-100/30 p-6 relative">
                  <div className="absolute inset-0 pointer-events-none opacity-30 z-0 rounded-2xl bg-gradient-to-br from-indigo-200/20 via-white to-purple-200/20" />
                  <div className="relative z-10 flex items-center gap-3">
                    <ChannelHeader title={channelTitle} />
                  </div>
                </div>
                <div className="flex-1 overflow-y-auto relative bg-gradient-to-br from-indigo-50/10 via-white to-purple-50/10">
                  <div className="absolute inset-0 pointer-events-none z-0 bg-[radial-gradient(circle_at_35%_30%,rgba(99,102,241,0.06),transparent_50%),radial-gradient(circle_at_75%_80%,rgba(147,51,234,0.05),transparent_50%)]" />
                  <div className="relative z-10">
                    <MessageList />
                  </div>
                </div>
                <div className="border-t p-3 bg-gradient-to-r from-indigo-50/50 via-white to-purple-50/50 relative">
                  <div className="absolute inset-0 pointer-events-none z-0 bg-gradient-to-r from-indigo-100/25 to-purple-100/25" />
                  <div className="relative z-10">
                    <MessageInput
                      additionalTextareaProps={{
                        className:
                          'border-indigo-200 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-200/50 ' +
                          'rounded-xl transition-all duration-200 shadow-sm hover:shadow-md bg-white/80 backdrop-blur',
                      }}
                    />
                  </div>
                </div>
              </Window>
              <Thread
                additionalMessageInputProps={{
                  className:
                    'border-indigo-200 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-200/50 ' +
                    'rounded-xl transition-all duration-200 shadow-sm hover:shadow-md bg-white/80 backdrop-blur',
                }}
              />
            </Channel>
          </Chat>
        </div>
      </main>
    </div>
  );
}
