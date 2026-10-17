import React, { useState } from 'react';
import { Eye, EyeOff, Loader2, AlertCircle, CheckCircle2 } from 'lucide-react';
import { authService, AuthUserData } from '../services/authService';

interface SignInProps {
  onNavigateToSignUp?: () => void;
  onNavigateToForgotPassword?: () => void;
  onNavigateToVerifyEmail?: (email?: string) => void;
  onSuccess?: (user?: AuthUserData) => void;
}

export const SignIn: React.FC<SignInProps> = ({
  onNavigateToSignUp,
  onNavigateToForgotPassword,
  onNavigateToVerifyEmail,
  onSuccess,
}) => {
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // Interaction states
  const [errors, setErrors] = useState<{ identifier?: string; password?: string }>({});
  const [touched, setTouched] = useState<{ identifier?: boolean; password?: boolean }>({});
  const [authError, setAuthError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const validate = (): boolean => {
    const newErrors: { identifier?: string; password?: string } = {};

    if (!identifier.trim()) {
      newErrors.identifier = 'Email or username is required.';
    }

    if (!password) {
      newErrors.password = 'Password is required.';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleBlur = (field: 'identifier' | 'password') => {
    setTouched((prev) => ({ ...prev, [field]: true }));
    if (field === 'identifier' && !identifier.trim()) {
      setErrors((prev) => ({ ...prev, identifier: 'Email or username is required.' }));
    } else if (field === 'identifier') {
      setErrors((prev) => ({ ...prev, identifier: undefined }));
    }

    if (field === 'password' && !password) {
      setErrors((prev) => ({ ...prev, password: 'Password is required.' }));
    } else if (field === 'password') {
      setErrors((prev) => ({ ...prev, password: undefined }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setTouched({ identifier: true, password: true });
    setAuthError(null);

    if (!validate()) {
      return;
    }

    setIsLoading(true);

    try {
      const response = await authService.signIn({ identifier, password });
      if (response.data?.token) {
        localStorage.setItem('bucksbunny_token', response.data.token);
      }
      if (response.data?.user) {
        localStorage.setItem('bucksbunny_user', JSON.stringify(response.data.user));
      }
      setIsSuccess(true);
      if (onSuccess) {
        setTimeout(() => onSuccess(response.data?.user), 800);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Invalid credentials. Please try again.';
      setAuthError(msg);
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
              Welcome back.
            </h1>
            <p className="text-base text-[#66716B]">
              Sign in to pick up where you left off.
            </p>
          </div>
        </div>

        {/* Authentication Error Feedback */}
        {authError && (
          <div
            role="alert"
            className="p-3.5 bg-[#FDF2F2] border border-[#F3B7B7] rounded-[4px] text-sm text-[#C24141] flex items-start gap-2.5"
          >
            <AlertCircle className="w-4.5 h-4.5 text-[#C24141] shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="font-semibold">Authentication failed</p>
              <p className="mt-0.5 text-[#66716B]">{authError}</p>
              {authError.toLowerCase().includes('verify your email') && onNavigateToVerifyEmail && (
                <button
                  type="button"
                  onClick={() => onNavigateToVerifyEmail(identifier.includes('@') ? identifier.trim() : '')}
                  className="mt-2 text-xs font-semibold text-[#064E3B] hover:underline flex items-center gap-1 cursor-pointer"
                >
                  Verify your email now &rarr;
                </button>
              )}
            </div>
          </div>
        )}

        {/* Success Feedback State */}
        {isSuccess && (
          <div
            role="status"
            className="p-3.5 bg-[#E8F5EC] border border-[#A6DEC0] rounded-[4px] text-sm text-[#064E3B] flex items-start gap-2.5"
          >
            <CheckCircle2 className="w-4.5 h-4.5 text-[#16A765] shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="font-semibold">Signed in successfully.</p>
              <p className="mt-0.5 text-[#66716B]">Redirecting to your account...</p>
            </div>
          </div>
        )}

        {/* Sign In Form */}
        <form onSubmit={handleSubmit} noValidate className="space-y-5">
          {/* Field: Email or Username */}
          <div className="space-y-2">
            <label
              htmlFor="identifier"
              className="block text-sm font-semibold text-[#17211D]"
            >
              Email or username
            </label>
            <input
              id="identifier"
              name="identifier"
              type="text"
              autoComplete="username"
              disabled={isLoading || isSuccess}
              value={identifier}
              onChange={(e) => {
                setIdentifier(e.target.value);
                if (touched.identifier) {
                  setErrors((prev) => ({ ...prev, identifier: undefined }));
                }
              }}
              onBlur={() => handleBlur('identifier')}
              placeholder="name@example.com or username"
              aria-invalid={touched.identifier && !!errors.identifier}
              aria-describedby={errors.identifier ? 'identifier-error' : undefined}
              className={`w-full h-11 px-3.5 text-base bg-white border rounded-[4px] text-[#17211D] placeholder:text-[#9BA39E] transition-colors focus:outline-none disabled:bg-[#F7F8F5] disabled:cursor-not-allowed ${
                touched.identifier && errors.identifier
                  ? 'border-[#C24141] focus:border-[#C24141] focus:ring-1 focus:ring-[#C24141]'
                  : 'border-[#E1E6E1] focus:border-[#16A765] focus:ring-1 focus:ring-[#16A765]'
              }`}
            />
            {touched.identifier && errors.identifier && (
              <p id="identifier-error" className="text-sm text-[#C24141]">
                {errors.identifier}
              </p>
            )}
          </div>

          {/* Field: Password */}
          <div className="space-y-2">
            <label
              htmlFor="password"
              className="block text-sm font-semibold text-[#17211D]"
            >
              Password
            </label>
            <div className="relative">
              <input
                id="password"
                name="password"
                type={showPassword ? 'text' : 'password'}
                autoComplete="current-password"
                disabled={isLoading || isSuccess}
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  if (touched.password) {
                    setErrors((prev) => ({ ...prev, password: undefined }));
                  }
                }}
                onBlur={() => handleBlur('password')}
                placeholder="Enter your password"
                aria-invalid={touched.password && !!errors.password}
                aria-describedby={errors.password ? 'password-error' : undefined}
                className={`w-full h-11 pl-3.5 pr-11 text-base bg-white border rounded-[4px] text-[#17211D] placeholder:text-[#9BA39E] transition-colors focus:outline-none disabled:bg-[#F7F8F5] disabled:cursor-not-allowed ${
                  touched.password && errors.password
                    ? 'border-[#C24141] focus:border-[#C24141] focus:ring-1 focus:ring-[#C24141]'
                    : 'border-[#E1E6E1] focus:border-[#16A765] focus:ring-1 focus:ring-[#16A765]'
                }`}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                disabled={isLoading || isSuccess}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#66716B] hover:text-[#17211D] focus:outline-none focus:text-[#17211D] transition-colors disabled:opacity-50 cursor-pointer"
              >
                {showPassword ? (
                  <EyeOff className="w-5 h-5" />
                ) : (
                  <Eye className="w-5 h-5" />
                )}
              </button>
            </div>
            {touched.password && errors.password && (
              <p id="password-error" className="text-sm text-[#C24141]">
                {errors.password}
              </p>
            )}
          </div>

          {/* Compact Row: Remember Me & Forgot Password */}
          <div className="flex items-center justify-between pt-1">
            <label className="inline-flex items-center gap-2.5 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={rememberMe}
                disabled={isLoading || isSuccess}
                onChange={(e) => setRememberMe(e.target.checked)}
                className="h-4.5 w-4.5 rounded-[3px] border-[#E1E6E1] text-[#064E3B] focus:ring-[#16A765] accent-[#064E3B] cursor-pointer"
              />
              <span className="text-sm text-[#66716B]">Remember me</span>
            </label>

            <button
              type="button"
              onClick={onNavigateToForgotPassword}
              className="text-sm font-medium text-[#064E3B] hover:text-[#043629] hover:underline transition-colors focus:outline-none cursor-pointer"
            >
              Forgot password?
            </button>
          </div>

          {/* Primary Action Button */}
          <div className="pt-2">
            <button
              type="submit"
              disabled={isLoading || isSuccess}
              className="w-full h-11 px-4 bg-[#064E3B] hover:bg-[#043629] text-white text-base font-semibold rounded-[4px] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 focus:outline-none focus:ring-2 focus:ring-[#16A765] focus:ring-offset-1 cursor-pointer"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4.5 h-4.5 animate-spin" />
                  <span>Signing in...</span>
                </>
              ) : (
                <span>Sign in</span>
              )}
            </button>
          </div>
        </form>

        {/* Footer Navigation Link */}
        <div className="pt-3 border-t border-[#E1E6E1] text-center">
          <p className="text-sm text-[#66716B]">
            New to BucksBunny?{' '}
            <button
              type="button"
              onClick={onNavigateToSignUp}
              className="font-semibold text-[#064E3B] hover:text-[#043629] hover:underline transition-colors focus:outline-none cursor-pointer"
            >
              Create an account
            </button>
          </p>
        </div>
      </div>
    </div>
  );
};
