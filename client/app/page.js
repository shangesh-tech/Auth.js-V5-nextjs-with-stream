"use client";
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function HomePage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  useEffect(() => {
    console.log('Session status:', status);
    console.log('Session data:', session);
    if (status === 'unauthenticated') {
      router.push('/login');
    }
  }, [status, router, session]);

  if (status === 'loading' || status === 'unauthenticated') {
    return <div>Loading...</div>;
  }

  return (
    <div>
      <h1>Welcome, {session?.user.email}!</h1>
      <p>This component is protected.</p>
    </div>
  );
}
