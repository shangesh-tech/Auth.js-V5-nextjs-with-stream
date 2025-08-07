import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { StreamChat } from 'stream-chat';
import { connectDB } from '@/lib/config/db';
import { User } from '@/lib/models/User';

const STREAM_API_KEY = process.env.STREAM_API_KEY;
const STREAM_API_SECRET = process.env.STREAM_API_SECRET;

export async function POST() {
    try {
        const session = await auth();

        const userId = session.user.id;

        await connectDB();

        const userInDb = await User.findById(userId);

        if (!userInDb) {
            return NextResponse.json(
                { error: 'User not found in your database' },
                { status: 404 }
            );
        }

        const serverClient = StreamChat.getInstance(STREAM_API_KEY, STREAM_API_SECRET);

        const streamUser = {
            id: userId.toString(),
            name: userInDb.firstName + ' ' + userInDb.lastName,
            image: userInDb.image,
        };

        await serverClient.upsertUser(streamUser);

        const token = serverClient.createToken(userId.toString());

        return NextResponse.json(
            {
                token,
                apiKey: STREAM_API_KEY,
                userId: userId.toString(),
            },
            { status: 200 }
        );

    } catch (error) {
        console.error('Error generating Stream token:', error);
        return NextResponse.json(
            { error: 'Failed to generate Stream token' },
            { status: 500 }
        );
    }
}
