/**
 * Frontend environment configuration helper.
 * Enforces and validates required frontend environment variables.
 */

interface FrontendConfig {
  apiBaseUrl: string;
  isDevelopment: boolean;
  isProduction: boolean;
  mode: string;
}

const rawApiBaseUrl = import.meta.env.VITE_API_BASE_URL;

if (!rawApiBaseUrl) {
  console.warn(
    `[Config Warning] VITE_API_BASE_URL is not defined in environment variables.\n` +
    `Defaulting to "http://localhost:5000/api/v1". Please create frontend/.env based on frontend/.env.example.`
  );
}

export const env: FrontendConfig = {
  apiBaseUrl: (rawApiBaseUrl || 'http://localhost:5000/api/v1').replace(/\/+$/, ''),
  isDevelopment: import.meta.env.DEV,
  isProduction: import.meta.env.PROD,
  mode: import.meta.env.MODE,
};
