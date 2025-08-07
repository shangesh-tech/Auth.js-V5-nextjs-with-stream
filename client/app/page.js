'use client';
import { useSession } from 'next-auth/react';

export default function HomePage() {
  const { data: session, status } = useSession();

  console.log("Session status:", status);
  console.log("Session data:", session);

  if (status === 'loading') {
    return <p>Loading...</p>;
  }

  if (!session) {
    return <p>Not logged in</p>;
  }

  return (
    <div>
      <p>Welcome, {session.user?.firstName || session.user?.name || 'User'}!</p>
    </div>
  );
}
