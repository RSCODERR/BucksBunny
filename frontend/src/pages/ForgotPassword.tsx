import React, { useState } from 'react';
import { Loader2, AlertCircle, CheckCircle2, ArrowLeft } from 'lucide-react';
import { authService } from '../services/authService';

interface ForgotPasswordProps {
  onCodeSent?: (email: string) => void;
  onNavigateToSignIn?: () => void;
}

export const ForgotPassword: React.FC<ForgotPasswordProps> = ({
  onCodeSent,
  onNavigateToSignIn,
}) => {
  const [email, setEmail] = useState('');
  const [touched, setTouched] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [serverError, setServerError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const validate = (): boolean => {
    if (!email.trim()) {
      setError('Email address is required.');
      return false;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setError('Please enter a valid email address.');
      return false;
    }
    setError(null);
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setTouched(true);
    setServerError(null);

    if (!validate()) {
      return;
    }

    setIsLoading(true);

    try {
      const response = await authService.forgotPassword({ email: email.trim() });
      setSuccessMessage(
        response.data?.message || 'If an account exists with this email, a 6-digit code has been sent.'
      );

      setTimeout(() => {
        if (onCodeSent) {
          onCodeSent(email.trim());
        }
      }, 1000);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Could not process request. Please try again.';
      setServerError(msg);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-72px)] w-full flex items-center justify-center py-12 px-4 sm:px-6 bg-[#F7F8F5]">
      <div className="w-full max-w-[440px] bg-white border border-[#E1E6E1] rounded-lg shadow-sm p-7 sm:p-9 space-y-7">
        {/* Top Header and Logo */}
        <div className="space-y-3.5">
          <div className="flex items-center gap-3">
            <img
              src="/logo.png"
              alt="BucksBunny"
              className="h-9 w-9 object-contain"
            />
            <span className="font-bold text-xl text-[#17211D] tracking-tight">
              BucksBunny
            </span>
          </div>

          <div className="space-y-1.5">
            <h1 className="text-2xl sm:text-[28px] font-bold text-[#17211D] tracking-tight">
              Forgot password?
            </h1>
            <p className="text-base text-[#66716B]">
              Enter the email address registered with your account. We will send you a 6-digit code to reset your password.
            </p>
          </div>
        </div>

        {/* Server Error Alert */}
        {serverError && (
          <div
            role="alert"
            className="p-3.5 bg-[#FDF2F2] border border-[#F3B7B7] rounded-[4px] text-sm text-[#C24141] flex items-start gap-2.5"
          >
            <AlertCircle className="w-4.5 h-4.5 text-[#C24141] shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="font-semibold">Request failed</p>
              <p className="mt-0.5 text-[#66716B]">{serverError}</p>
            </div>
          </div>
        )}

        {/* Success Alert */}
        {successMessage && (
          <div
            role="status"
            className="p-3.5 bg-[#E8F5EC] border border-[#A6DEC0] rounded-[4px] text-sm text-[#064E3B] flex items-start gap-2.5"
          >
            <CheckCircle2 className="w-4.5 h-4.5 text-[#16A765] shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="font-semibold">Reset code sent</p>
              <p className="mt-0.5 text-[#66716B]">{successMessage}</p>
            </div>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} noValidate className="space-y-5">
          <div className="space-y-2">
            <label htmlFor="reset-email" className="block text-sm font-semibold text-[#17211D]">
              Email address
            </label>
            <div className="relative">
              <input
                id="reset-email"
                type="email"
                autoComplete="email"
                disabled={isLoading || !!successMessage}
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  if (touched) setError(null);
                }}
                onBlur={() => {
                  setTouched(true);
                  validate();
                }}
                placeholder="name@example.com"
                aria-invalid={touched && !!error}
                aria-describedby={error ? 'email-error' : undefined}
                className={`w-full h-11 px-3.5 text-base bg-white border rounded-[4px] text-[#17211D] placeholder:text-[#9BA39E] transition-colors focus:outline-none disabled:bg-[#F7F8F5] disabled:cursor-not-allowed ${
                  touched && error
                    ? 'border-[#C24141] focus:border-[#C24141] focus:ring-1 focus:ring-[#C24141]'
                    : 'border-[#E1E6E1] focus:border-[#16A765] focus:ring-1 focus:ring-[#16A765]'
                }`}
              />
            </div>
            {touched && error && (
              <p id="email-error" className="text-sm text-[#C24141]">
                {error}
              </p>
            )}
          </div>

          <button
            type="submit"
            disabled={isLoading || !!successMessage}
            className="w-full h-11 px-4 bg-[#064E3B] hover:bg-[#043629] text-white text-base font-semibold rounded-[4px] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 focus:outline-none focus:ring-2 focus:ring-[#16A765] focus:ring-offset-1 cursor-pointer shadow-xs"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4.5 h-4.5 animate-spin" />
                <span>Sending code...</span>
              </>
            ) : (
              <span>Send Reset Code</span>
            )}
          </button>
        </form>

        {/* Footer Navigation */}
        <div className="pt-2 border-t border-[#F0F2EE] text-center">
          {onNavigateToSignIn && (
            <button
              type="button"
              onClick={onNavigateToSignIn}
              className="inline-flex items-center gap-1.5 text-sm font-medium text-[#17211D] hover:text-[#064E3B] transition-colors cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back to Sign In</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
