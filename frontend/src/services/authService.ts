import { apiClient } from './apiClient';
import { ApiResponse } from '../types/api';

export interface AuthUserData {
  id: string;
  username: string;
  email: string;
  agreedToTerms: boolean;
  agreedToTermsAt?: string;
  createdAt: string;
}

export interface AuthResponseData {
  message: string;
  user: AuthUserData;
}

export interface SignUpPayload {
  username: string;
  email: string;
  password: string;
  agreedToTerms: boolean;
}

export interface SignInPayload {
  identifier: string;
  password: string;
}

export const authService = {
  signUp: async (payload: SignUpPayload): Promise<ApiResponse<AuthResponseData>> => {
    return apiClient<ApiResponse<AuthResponseData>>('/auth/signup', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  signIn: async (payload: SignInPayload): Promise<ApiResponse<AuthResponseData>> => {
    return apiClient<ApiResponse<AuthResponseData>>('/auth/signin', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },
};
