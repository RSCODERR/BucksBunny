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
  if (mongoose.connection.listenerCount('error') === 0) {
    mongoose.connection.on('connected', () => {
      console.log(`[Database] MongoDB connection established successfully.`);
    });

    mongoose.connection.on('error', (err) => {
      if (mongoose.connection.readyState === 1) {
        console.error(`[Database] MongoDB connection error:`, err);
      }
    });

    mongoose.connection.on('disconnected', () => {
      console.warn(`[Database] MongoDB connection disconnected.`);
    });
  }

  try {
    const conn = await mongoose.connect(env.MONGODB_URI, {
      serverSelectionTimeoutMS: 3000,
    });
    return conn;
  } catch (error: any) {
    if (env.NODE_ENV === 'development') {
      const isAtlasDenied =
        error?.message?.includes('whitelist') ||
        error?.cause?.code === 'ERR_SSL_TLSV1_ALERT_INTERNAL_ERROR';

      if (isAtlasDenied) {
        console.warn(
          `[Database Notice] MongoDB Atlas access was denied (IP not whitelisted in Atlas Network Access). Falling back to local MongoDB...`
        );
      } else {
        console.warn(
          `[Database Warning] Could not connect to primary URI (${env.MONGODB_URI}). Trying local MongoDB instance...`
        );
      }

      try {
        const localConn = await mongoose.connect('mongodb://127.0.0.1:27017/bucksbunny', {
          serverSelectionTimeoutMS: 3000,
        });
        console.log(`[Database] Connected to local MongoDB instance successfully.`);
        return localConn;
      } catch (localErr) {
        console.error(`[Database] Local MongoDB instance connection also failed.`);
      }
    }

    console.error(`[Database] Failed to connect to MongoDB:`, error?.message || error);
    throw error;
  }
};

export const disconnectFromDatabase = async (): Promise<void> => {
  if (mongoose.connection.readyState !== 0) {
    await mongoose.disconnect();
    console.log(`[Database] MongoDB connection cleanly closed.`);
  }
};
