import { apiClient } from './apiClient';
import { ApiResponse } from '../types/api';

export interface AuthUserData {
  id: string;
  username: string;
  email: string;
  agreedToTerms: boolean;
  agreedToTermsAt?: string;
  isEmailVerified?: boolean;
  createdAt: string;
}

export interface AuthResponseData {
  message: string;
  email?: string;
  isEmailVerified?: boolean;
  user?: AuthUserData;
  token?: string;
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

export interface VerifyEmailPayload {
  email: string;
  code: string;
}

export interface ResendVerificationPayload {
  email: string;
}

export interface ForgotPasswordPayload {
  email: string;
}

export interface ResetPasswordPayload {
  email: string;
  code: string;
  newPassword: string;
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

  verifyEmail: async (payload: VerifyEmailPayload): Promise<ApiResponse<AuthResponseData>> => {
    return apiClient<ApiResponse<AuthResponseData>>('/auth/verify-email', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  resendVerification: async (payload: ResendVerificationPayload): Promise<ApiResponse<{ message: string; email: string }>> => {
    return apiClient<ApiResponse<{ message: string; email: string }>>('/auth/resend-verification', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  forgotPassword: async (payload: ForgotPasswordPayload): Promise<ApiResponse<{ message: string; email: string }>> => {
    return apiClient<ApiResponse<{ message: string; email: string }>>('/auth/forgot-password', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  resetPassword: async (payload: ResetPasswordPayload): Promise<ApiResponse<{ message: string }>> => {
    return apiClient<ApiResponse<{ message: string }>>('/auth/reset-password', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },
};
