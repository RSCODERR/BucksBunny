import { Server } from 'http';
import app from './app';
import { env } from './config/env';
import { connectToDatabase, disconnectFromDatabase } from './config/database';
import { purgeExpiredResetCodes } from './controllers/auth.controller';

let server: Server | null = null;
let resetCodeCleanupInterval: NodeJS.Timeout | null = null;

async function startServer(): Promise<void> {
  console.log(`[Server] Starting BucksBunny API in ${env.NODE_ENV} mode...`);

  // Connect to MongoDB
  try {
    await connectToDatabase();
    // Purge any lingering expired password reset codes from the database
    await purgeExpiredResetCodes();
    // Schedule periodic purge every 60 seconds
    resetCodeCleanupInterval = setInterval(() => {
      purgeExpiredResetCodes();
    }, 60 * 1000);
  } catch (error) {
    console.error(`[Server Warning] Could not connect to MongoDB initially. Health check will report database status.`);
    // Note: In development or during bootstrapping, we allow server to run so health checks can report status,
    // or you can configure this to exit depending on deployment needs.
  }

  // Start HTTP Server
  server = app.listen(env.PORT, () => {
    console.log(`[Server] Server is running and listening on port ${env.PORT}`);
    console.log(`[Server] Health check available at: http://localhost:${env.PORT}/api/v1/health`);
    console.log(`[Server] Configured CORS origin: ${env.CORS_ORIGIN}`);
  });

  server.on('error', (err: NodeJS.ErrnoException) => {
    if (err.code === 'EADDRINUSE') {
      console.error(
        `\n[Server Error] Port ${env.PORT} is already in use by another process.\n` +
        `If another dev server is running, terminate it before starting a new one.\n`
      );
      process.exit(1);
    } else {
      console.error(`[Server Error]`, err);
      process.exit(1);
    }
  });
}

// Graceful shutdown
async function gracefulShutdown(signal: string): Promise<void> {
  console.log(`\n[Server] Received ${signal}. Initiating graceful shutdown...`);

  if (resetCodeCleanupInterval) {
    clearInterval(resetCodeCleanupInterval);
    resetCodeCleanupInterval = null;
  }

  if (server) {
    server.close(async () => {
      console.log(`[Server] HTTP server closed.`);
      try {
        await disconnectFromDatabase();
      } catch (err) {
        console.error(`[Server] Error while disconnecting from database:`, err);
      }
      process.exit(0);
    });
  } else {
    process.exit(0);
  }

  // Force exit after 10 seconds if graceful shutdown takes too long
  setTimeout(() => {
    console.error(`[Server] Forceful shutdown initiated after timeout.`);
    process.exit(1);
  }, 10000);
}

process.on('SIGINT', () => gracefulShutdown('SIGINT'));
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));

process.on('unhandledRejection', (reason) => {
  console.error(`[Process] Unhandled Promise Rejection:`, reason);
});

process.on('uncaughtException', (err) => {
  console.error(`[Process] Uncaught Exception:`, err);
  process.exit(1);
});

startServer();
