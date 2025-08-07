import mongoose from "mongoose";

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
    throw new Error('Please define the MONGODB_URI environment variable');
}

const options = {
    maxPoolSize: 10,
    minPoolSize: 2,
    socketTimeoutMS: 30000,
    autoIndex: true,
    retryWrites: true,
    serverSelectionTimeoutMS: 5000,
    family: 4
};

let cached = global.mongoose;

if (!cached) {
    cached = global.mongoose = {
        conn: null,
        promise: null,
        isConnecting: false
    };
}

export async function connectDB() {
    if (cached.conn) {
        return cached.conn;
    }

    if (cached.isConnecting) {
        return cached.promise;
    }

    try {
        cached.isConnecting = true;

        if (!cached.promise) {
            cached.promise = mongoose.connect(MONGODB_URI, options)
                .then((mongoose) => {
                    console.log('✅ MongoDB Connected Successfully');
                    return mongoose;
                })
                .catch((error) => {
                    console.error('❌ MongoDB Connection Error:', error);
                    cached.promise = null;
                    throw error;
                })
                .finally(() => {
                    cached.isConnecting = false;
                });
        }

        cached.conn = await cached.promise;

        // Add connection event listeners
        mongoose.connection.on('connected', () => {
            console.log('MongoDB connection established');
        });

        mongoose.connection.on('error', (err) => {
            console.error('MongoDB connection error:', err);
        });

        mongoose.connection.on('disconnected', () => {
            console.log('MongoDB connection disconnected');
        });

        return cached.conn;

    } catch (error) {
        cached.promise = null;
        cached.isConnecting = false;
        throw error;
    }
}

// Helper function to check connection status
export function getConnectionStatus() {
    return {
        readyState: mongoose.connection.readyState,
        status: ['disconnected', 'connected', 'connecting', 'disconnecting'][mongoose.connection.readyState] || 'unknown'
    };
}

// Helper function for graceful shutdown
export async function disconnectDB() {
    try {
        await mongoose.connection.close();
        cached.conn = null;
        cached.promise = null;
        console.log('MongoDB disconnected successfully');
    } catch (error) {
        console.error('Error while disconnecting MongoDB:', error);
        throw error;
    }
} 