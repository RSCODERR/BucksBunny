import mongoose from 'mongoose';
import { env } from './env';

const READY_STATES: Record<number, string> = {
  0: 'disconnected',
  1: 'connected',
  2: 'connecting',
  3: 'disconnecting',
};

export const getDatabaseStatus = (): { status: string; isConnected: boolean } => {
  const readyState = mongoose.connection.readyState;
  return {
    status: READY_STATES[readyState] || 'unknown',
    isConnected: readyState === 1,
  };
};

export const connectToDatabase = async (): Promise<typeof mongoose> => {
  try {
    mongoose.connection.on('connected', () => {
      console.log(`[Database] MongoDB connection established successfully.`);
    });

    mongoose.connection.on('error', (err) => {
      console.error(`[Database] MongoDB connection error:`, err);
    });

    mongoose.connection.on('disconnected', () => {
      console.warn(`[Database] MongoDB connection disconnected.`);
    });

    const conn = await mongoose.connect(env.MONGODB_URI);
    return conn;
  } catch (error) {
    console.error(`[Database] Failed to connect to MongoDB at ${env.MONGODB_URI}:`, error);
    throw error;
  }
};

export const disconnectFromDatabase = async (): Promise<void> => {
  if (mongoose.connection.readyState !== 0) {
    await mongoose.disconnect();
    console.log(`[Database] MongoDB connection cleanly closed.`);
  }
};
