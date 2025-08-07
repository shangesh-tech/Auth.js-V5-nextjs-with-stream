import { NextResponse } from 'next/server';
import { User } from '@/lib/models/User';
import { connectDB } from '@/lib/config/db';
import crypto from 'crypto';
import { sendEmail } from '@/lib/config/email';

export async function POST(req) {
    try {
        const { email } = await req.json();

        if (!email) {
            return NextResponse.json(
                { message: 'Email is required' },
                { status: 400 }
            );
        }

        // Basic email format validation
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            return NextResponse.json(
                { message: 'Invalid email format' },
                { status: 400 }
            );
        }

        await connectDB();

        const user = await User.findOne({ email });
        if (!user) {
            return NextResponse.json(
                { message: 'If an account exists with that email, a reset link has been sent.' }
            );
        }

        // Rate limit: check if a token was requested in the last 5 minutes
        const lastRequested = user.resetPasswordExpire;
        if (lastRequested && lastRequested > Date.now() - 5 * 60 * 1000) {
            return NextResponse.json(
                { message: 'Please wait a few minutes before requesting another password reset.' },
                { status: 429 }
            );
        }

        // Generate reset token
        const resetToken = crypto.randomBytes(32).toString('hex');
        const resetTokenExpiry = Date.now() + 3600000; // Token valid for 1 hour

        const hashedToken = crypto
            .createHash('sha256')
            .update(resetToken)
            .digest('hex');


        user.resetPasswordToken = hashedToken;
        user.resetPasswordExpire = resetTokenExpiry;
        await user.save();

        const resetUrl = `${process.env.NEXTAUTH_URL}/reset-password?token=${resetToken}`;

        const message = `
            <!DOCTYPE html>
            <html>
            <head>
                <style>
                    .container {
                        padding: 20px;
                        max-width: 600px;
                        margin: 0 auto;
                        font-family: Arial, sans-serif;
                    }
                    .header {
                        background: #4F46E5;
                        color: white;
                        padding: 20px;
                        text-align: center;
                        border-radius: 5px 5px 0 0;
                    }
                    .content {
                        background: #ffffff;
                        padding: 20px;
                        border: 1px solid #e5e7eb;
                        border-top: none;
                        border-radius: 0 0 5px 5px;
                    }
                    .button {
                        display: inline-block;
                        padding: 12px 24px;
                        background-color: #4F46E5;
                        color: white;
                        text-decoration: none;
                        border-radius: 5px;
                        margin: 20px 0;
                    }
                    .footer {
                        margin-top: 20px;
                        text-align: center;
                        color: #6B7280;
                        font-size: 0.875rem;
                    }
                </style>
            </head>
            <body>
                <div class="container">
                    <div class="header">
                        <h1>Reset Your Password</h1>
                    </div>
                    <div class="content">
                        <p>Hello ${user.firstName},</p>
                        <p>We received a request to reset your password. Click the button below to create a new password:</p>
                        <div style="text-align: center;">
                            <a href="${resetUrl}" class="button">Reset Password</a>
                        </div>
                        <p>If you didn't request this password reset, you can safely ignore this email. The link will expire in 1 hour.</p>
                        <p>For security reasons, this link can only be used once.</p>
                        <div class="footer">
                            <p>This email was sent from your Inkwell Blog application.</p>
                        </div>
                    </div>
                </div>
            </body>
            </html>
        `;

        try {

            await sendEmail({
                to: user.email,
                subject: 'Reset Your Password - Alumini chain',
                html: message,
            });

            return NextResponse.json({
                message: `Password reset link sent to email ${user.email}`,
                development: process.env.NODE_ENV !== 'production'
            });
            
        } catch (error) {
            console.error('Email sending error:', error);


            user.resetPasswordToken = undefined;
            user.resetPasswordExpire = undefined;
            await user.save();

            return NextResponse.json(
                { message: 'Email could not be sent' },
                { status: 500 }
            );
        }
    } catch (error) {
        console.error('Password reset error:', error);

        return NextResponse.json(
            { message: 'Internal server error' },
            { status: 500 }
        );
    }
}
