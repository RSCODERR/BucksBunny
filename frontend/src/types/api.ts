export interface ApiResponse<T> {
  success: boolean;
  data: T;
  error?: {
    message: string;
    statusCode: number;
    details?: unknown;
    stack?: string;
  };
}

export interface DatabaseStatus {
  status: 'connected' | 'connecting' | 'disconnecting' | 'disconnected' | 'unknown';
  isConnected: boolean;
}

export interface HealthCheckData {
  name: string;
  status: string;
  timestamp: string;
  uptimeSeconds: number;
  environment: string;
  database: DatabaseStatus;
}

export type HealthResponse = ApiResponse<HealthCheckData>;
