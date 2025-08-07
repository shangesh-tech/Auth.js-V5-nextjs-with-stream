import { NextResponse } from 'next/server';
import { User } from '@/lib/models/User';
import { connectDB } from '@/lib/config/db';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';

export async function POST(req) {
    try {
        const { token, password } = await req.json();


        if (!token || !password) {
            return NextResponse.json(
                { message: 'Missing required fields' },
                { status: 400 }
            );
        }

        if (password.length < 8) {
            return NextResponse.json(
                { message: 'Password must be at least 8 characters long' },
                { status: 400 }
            );
        }

        await connectDB();


        const hashedToken = crypto
            .createHash('sha256')
            .update(token)
            .digest('hex');

        const user = await User.findOne({
            resetPasswordToken: hashedToken,
            resetPasswordExpire: { $gt: Date.now() },
        });

        if (!user) {
            return NextResponse.json(
                { message: 'Invalid or expired reset token' },
                { status: 400 }
            );
        }

        // Hash the new password
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);


        user.password = hashedPassword;
        user.resetPasswordToken = undefined;
        user.resetPasswordExpire = undefined;
        await user.save();

        return NextResponse.json({
            message: 'Password reset successful for ' + user.email,
        });
    } catch (error) {
        console.error('Password reset error:', error);

        return NextResponse.json(
            {
                message: 'An error occurred while resetting your password. Please try again later.'
            },
            { status: 500 }
        );
    }
}
