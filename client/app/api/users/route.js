import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { connectDB } from '@/lib/config/db';
import { User } from '@/lib/models/User';

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();

    // Exclude current user, omit sensitive fields
    const users = await User.find(
      { _id: { $ne: session.user.id } },
      'firstName lastName email image role gender'
    ).lean();

    return NextResponse.json({ users }, { status: 200 });
  } catch (error) {
    console.error('Error fetching users:', error);
    return NextResponse.json({ error: 'Failed to fetch users' }, { status: 500 });
  }
}
