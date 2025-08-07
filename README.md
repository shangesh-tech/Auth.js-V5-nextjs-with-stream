# Auth.js-V5-nextjs-with-stream

### Production Deployment Changes for NextAuth on Vercel

When deploying to Vercel at production level, your `auth.js` cookie config is already dynamic and handles most differences via `process.env.NODE_ENV === "production"`. However, you'll need to update a few things for security, domain scoping, and environment variables. Below is a markdown table summarizing the key changes. Focus on the `cookies` section first (as you highlighted), then broader setup.

| Area | What to Change | Why/Details |
|------|----------------|-------------|
| **Cookie Domain** | Change `domain: "localhost"` to `domain: process.env.VERCEL_URL || "yourdomain.com"` (replace "yourdomain.com" with your actual domain). For subdomains, use `".yourdomain.com"`. | In production, cookies must be scoped to your real domain (e.g., from Vercel) for cross-request persistence. "localhost" only works in dev and would break sessions on your live site. Use `process.env.VERCEL_URL` for auto-detection on Vercel. |
| **Cookie Secure Flag** | No code change needed—it's already `secure: process.env.NODE_ENV === "production"`, which sets to `true` in prod. | Ensures cookies are only sent over HTTPS (required for security on live sites). Vercel provides HTTPS by default, so this auto-enables. |
| **Cookie Name** | No code change needed—it's already dynamic: `${process.env.NODE_ENV === "production" ? "__Secure-" : ""}next-auth.session-token`. | In prod, it becomes `__Secure-next-auth.session-token` automatically, which is best practice for secure contexts. |
| **SameSite Attribute** | Optional: Consider changing `sameSite: "lax"` to `sameSite: "strict"` if your app doesn't need cross-site requests (e.g., no embeds). Keep "lax" if you do. | "Lax" is safe for most apps but "strict" adds extra protection against CSRF. Test for any iframe or third-party issues on Vercel. |
| **MaxAge Sync** | No change needed, but ensure it matches your `session.maxAge` (e.g., if you adjust one, update the other). | Keeps session and cookie expirations in sync. In prod, use a reasonable value like 24 hours to balance security and user experience. |
| **Environment Variables (Vercel Dashboard)** | Add/update these in Vercel project settings:- `NODE_ENV=production`- `NEXTAUTH_URL=https://yourdomain.com` (or your custom domain)- `NEXTAUTH_SECRET` (keep your existing value or generate a stronger one)- All other secrets (e.g., `GITHUB_CLIENT_ID`, MongoDB URI) | Vercel sets `NODE_ENV=production` automatically on deploy, but confirm it. `NEXTAUTH_URL` must use HTTPS and match your domain to avoid redirect/cookie mismatches. Add these via Vercel dashboard > Environment Variables. |
| **Other Production Tweaks** | - Add `debug: false` to your NextAuth config (if you had it enabled for testing).- In `session` config, consider shortening `maxAge` for security (e.g., 1 hour) or use database sessions if JWT isn't sufficient.- Enable Vercel's edge middleware if needed for auth. | Reduces logging in prod for performance. Test thoroughly on a preview branch before main deploy. Monitor Vercel logs for any cookie-related errors post-deploy. |

#### Updated `cookies` Section for Production
Here's how your `cookies` block in `auth.js` should look after the domain change (copy-paste this):

```javascript
cookies: {
  sessionToken: {
    name: `${process.env.NODE_ENV === "production" ? "__Secure-" : ""}next-auth.session-token`,
    options: {
      httpOnly: true,
      sameSite: "lax", // Or "strict" if preferred
      path: "/",
      domain: process.env.VERCEL_URL || "yourdomain.com", // Update to your domain
      secure: process.env.NODE_ENV === "production",
      maxAge: 24 * 60 * 60, // Sync with session maxAge
    },
  },
}
```

Deploy to Vercel by pushing to your repo (Vercel auto-builds). After deployment, test login in a browser—check dev tools for the secure cookie and ensure sessions persist. If issues arise (e.g., cross-origin problems), Vercel's docs on env vars and cookies are helpful. Let me know if you need more tweaks!


page.js

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


route.js

import { auth } from "@/auth";
import { NextResponse } from "next/server";

export async function GET(request) {
  const session = await auth();

  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  return NextResponse.json({
    user: {
      id: session.user.id,
      email: session.user.email,
      role: session.user.role
    },
  });
}
