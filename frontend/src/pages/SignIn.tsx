import React, { useState } from 'react';
import { Eye, EyeOff, Loader2, AlertCircle, CheckCircle2 } from 'lucide-react';

interface SignInProps {
  onNavigateToSignUp?: () => void;
  onNavigateToForgotPassword?: () => void;
  onSuccess?: () => void;
}

export const SignIn: React.FC<SignInProps> = ({
  onNavigateToSignUp,
  onNavigateToForgotPassword,
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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setTouched({ identifier: true, password: true });
    setAuthError(null);

    if (!validate()) {
      return;
    }

    setIsLoading(true);

    // Simulate authentication processing for interaction state fidelity
    setTimeout(() => {
      setIsLoading(false);
      setIsSuccess(true);
      if (onSuccess) {
        setTimeout(onSuccess, 1000);
      }
    }, 1200);
  };

  return (
    <div className="min-h-[calc(100vh-64px)] w-full flex items-center justify-center py-10 px-4 sm:px-6 bg-[#F7F8F5]">
      <div className="w-full max-w-[420px] bg-white border border-[#E1E6E1] rounded-lg shadow-sm p-6 sm:p-8 space-y-6">
        {/* Top Header and Logo */}
        <div className="space-y-3">
          <div className="flex items-center gap-2.5">
            <img
              src="/logo.png"
              alt="BucksBunny"
              className="h-8 w-8 object-contain"
            />
            <span className="font-semibold text-lg text-[#17211D] tracking-tight">
              BucksBunny
            </span>
          </div>

          <div className="space-y-1">
            <h1 className="text-xl sm:text-2xl font-bold text-[#17211D] tracking-tight">
              Welcome back.
            </h1>
            <p className="text-sm text-[#66716B]">
              Sign in to pick up where you left off.
            </p>
          </div>
        </div>

        {/* Authentication Error Feedback */}
        {authError && (
          <div
            role="alert"
            className="p-3 bg-[#FDF2F2] border border-[#F3B7B7] rounded-[4px] text-xs text-[#C24141] flex items-start gap-2.5"
          >
            <AlertCircle className="w-4 h-4 text-[#C24141] shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="font-medium">Authentication failed</p>
              <p className="mt-0.5 text-[#66716B]">{authError}</p>
            </div>
          </div>
        )}

        {/* Success Feedback State */}
        {isSuccess && (
          <div
            role="status"
            className="p-3 bg-[#E8F5EC] border border-[#A6DEC0] rounded-[4px] text-xs text-[#064E3B] flex items-start gap-2.5"
          >
            <CheckCircle2 className="w-4 h-4 text-[#16A765] shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="font-medium">Signed in successfully.</p>
              <p className="mt-0.5 text-[#66716B]">Redirecting to your account...</p>
            </div>
          </div>
        )}

        {/* Sign In Form */}
        <form onSubmit={handleSubmit} noValidate className="space-y-4">
          {/* Field: Email or Username */}
          <div className="space-y-1.5">
            <label
              htmlFor="identifier"
              className="block text-xs font-medium text-[#17211D]"
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
              className={`w-full h-10 px-3 text-sm bg-white border rounded-[4px] text-[#17211D] placeholder:text-[#9BA39E] transition-colors focus:outline-none disabled:bg-[#F7F8F5] disabled:cursor-not-allowed ${
                touched.identifier && errors.identifier
                  ? 'border-[#C24141] focus:border-[#C24141] focus:ring-1 focus:ring-[#C24141]'
                  : 'border-[#E1E6E1] focus:border-[#16A765] focus:ring-1 focus:ring-[#16A765]'
              }`}
            />
            {touched.identifier && errors.identifier && (
              <p id="identifier-error" className="text-xs text-[#C24141]">
                {errors.identifier}
              </p>
            )}
          </div>

          {/* Field: Password */}
          <div className="space-y-1.5">
            <label
              htmlFor="password"
              className="block text-xs font-medium text-[#17211D]"
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
                className={`w-full h-10 pl-3 pr-10 text-sm bg-white border rounded-[4px] text-[#17211D] placeholder:text-[#9BA39E] transition-colors focus:outline-none disabled:bg-[#F7F8F5] disabled:cursor-not-allowed ${
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
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[#66716B] hover:text-[#17211D] focus:outline-none focus:text-[#17211D] transition-colors disabled:opacity-50"
              >
                {showPassword ? (
                  <EyeOff className="w-4 h-4" />
                ) : (
                  <Eye className="w-4 h-4" />
                )}
              </button>
            </div>
            {touched.password && errors.password && (
              <p id="password-error" className="text-xs text-[#C24141]">
                {errors.password}
              </p>
            )}
          </div>

          {/* Compact Row: Remember Me & Forgot Password */}
          <div className="flex items-center justify-between pt-1">
            <label className="inline-flex items-center gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={rememberMe}
                disabled={isLoading || isSuccess}
                onChange={(e) => setRememberMe(e.target.checked)}
                className="h-4 w-4 rounded-[3px] border-[#E1E6E1] text-[#064E3B] focus:ring-[#16A765] accent-[#064E3B] cursor-pointer"
              />
              <span className="text-xs text-[#66716B]">Remember me</span>
            </label>

            <button
              type="button"
              onClick={onNavigateToForgotPassword}
              className="text-xs font-medium text-[#064E3B] hover:text-[#043629] hover:underline transition-colors focus:outline-none"
            >
              Forgot password?
            </button>
          </div>

          {/* Primary Action Button */}
          <div className="pt-2">
            <button
              type="submit"
              disabled={isLoading || isSuccess}
              className="w-full h-10 px-4 bg-[#064E3B] hover:bg-[#043629] text-white text-sm font-medium rounded-[4px] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 focus:outline-none focus:ring-2 focus:ring-[#16A765] focus:ring-offset-1"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Signing in...</span>
                </>
              ) : (
                <span>Sign in</span>
              )}
            </button>
          </div>
        </form>

        {/* Footer Navigation Link */}
        <div className="pt-2 border-t border-[#E1E6E1] text-center">
          <p className="text-xs text-[#66716B]">
            New to BucksBunny?{' '}
            <button
              type="button"
              onClick={onNavigateToSignUp}
              className="font-medium text-[#064E3B] hover:text-[#043629] hover:underline transition-colors focus:outline-none"
            >
              Create an account
            </button>
          </p>
        </div>
      </div>
    </div>
  );
};
