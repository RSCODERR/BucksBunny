import { apiClient } from './apiClient';
import { HealthResponse } from '../types/api';

export const healthService = {
  checkHealth: async (): Promise<HealthResponse> => {
    return apiClient<HealthResponse>('/health');
  },
};
