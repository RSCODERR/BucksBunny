import dotenv from 'dotenv';
import path from 'path';

// Load environment variables from .env file
dotenv.config();

export interface EnvConfig {
  PORT: number;
  NODE_ENV: 'development' | 'production' | 'test';
  MONGODB_URI: string;
  CORS_ORIGIN: string;
  BREVO_API_KEY: string;
  BREVO_SENDER_EMAIL: string;
  BREVO_SENDER_NAME: string;
  AUTH_SECRET: string;
}

function validateEnv(): EnvConfig {
  const missingVars: string[] = [];

  const rawMongoUri = process.env.MONGODB_URI;
  if (!rawMongoUri || rawMongoUri.trim() === '') {
    missingVars.push('MONGODB_URI');
  }

  const rawCorsOrigin = process.env.CORS_ORIGIN;
  if (!rawCorsOrigin || rawCorsOrigin.trim() === '') {
    missingVars.push('CORS_ORIGIN');
  }

  if (missingVars.length > 0) {
    const errorDetails = missingVars.map((varName) => {
      switch (varName) {
        case 'MONGODB_URI':
          return '  - MONGODB_URI: MongoDB connection string (e.g. mongodb://localhost:27017/bucksbunny)';
        case 'CORS_ORIGIN':
          return '  - CORS_ORIGIN: Allowed frontend origin URL (e.g. http://localhost:5173)';
        default:
          return `  - ${varName}`;
      }
    }).join('\n');

    throw new Error(
      `\n=======================================================\n` +
      `[Configuration Error] Missing required environment variable(s):\n` +
      `${errorDetails}\n\n` +
      `Please create or update your backend/.env file from backend/.env.example.\n` +
      `=======================================================\n`
    );
  }

  const rawPort = process.env.PORT || '5000';
  const parsedPort = parseInt(rawPort, 10);
  if (isNaN(parsedPort) || parsedPort <= 0 || parsedPort > 65535) {
    throw new Error(`[Configuration Error] Invalid PORT specified: "${rawPort}". Must be a valid port number between 1 and 65535.`);
  }

  const validEnvironments = ['development', 'production', 'test'] as const;
  const rawEnv = (process.env.NODE_ENV || 'development') as EnvConfig['NODE_ENV'];
  if (!validEnvironments.includes(rawEnv)) {
    throw new Error(
      `[Configuration Error] Invalid NODE_ENV "${rawEnv}". Expected one of: ${validEnvironments.join(', ')}.`
    );
  }

  return {
    PORT: parsedPort,
    NODE_ENV: rawEnv,
    MONGODB_URI: rawMongoUri!.trim(),
    CORS_ORIGIN: rawCorsOrigin!.trim(),
    BREVO_API_KEY: (process.env.BREVO_API_KEY || '').trim(),
    BREVO_SENDER_EMAIL: (process.env.BREVO_SENDER_EMAIL || 'bucksbunnyft@gmail.com').trim(),
    BREVO_SENDER_NAME: (process.env.BREVO_SENDER_NAME || 'BucksBunny').trim(),
    AUTH_SECRET: (process.env.AUTH_SECRET || 'bucksbunny_auth_secret_dev_key_2026').trim(),
  };
}

export const env: EnvConfig = validateEnv();
