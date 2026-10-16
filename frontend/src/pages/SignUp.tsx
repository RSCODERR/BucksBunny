import React, { useState } from 'react';
import { Eye, EyeOff, Loader2, AlertCircle, CheckCircle2 } from 'lucide-react';

interface SignUpProps {
  onNavigateToSignIn?: () => void;
  onNavigateToTerms?: () => void;
  onNavigateToPrivacy?: () => void;
  onSuccess?: () => void;
}

export const SignUp: React.FC<SignUpProps> = ({
  onNavigateToSignIn,
  onNavigateToTerms,
  onNavigateToPrivacy,
  onSuccess,
}) => {
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // Interaction states
  const [errors, setErrors] = useState<{
    username?: string;
    email?: string;
    password?: string;
  }>({});
  const [touched, setTouched] = useState<{
    username?: boolean;
    email?: boolean;
    password?: boolean;
  }>({});
  const [serverError, setServerError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const validate = (): boolean => {
    const newErrors: { username?: string; email?: string; password?: string } = {};

    if (!username.trim()) {
      newErrors.username = 'Username is required.';
    } else if (username.trim().length < 3) {
      newErrors.username = 'Username must be at least 3 characters.';
    }

    if (!email.trim()) {
      newErrors.email = 'Email address is required.';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      newErrors.email = 'Please enter a valid email address.';
    }

    if (!password) {
      newErrors.password = 'Password is required.';
    } else if (password.length < 8) {
      newErrors.password = 'Password must be at least 8 characters.';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleBlur = (field: 'username' | 'email' | 'password') => {
    setTouched((prev) => ({ ...prev, [field]: true }));

    if (field === 'username') {
      if (!username.trim()) {
        setErrors((prev) => ({ ...prev, username: 'Username is required.' }));
      } else if (username.trim().length < 3) {
        setErrors((prev) => ({ ...prev, username: 'Username must be at least 3 characters.' }));
      } else {
        setErrors((prev) => ({ ...prev, username: undefined }));
      }
    }

    if (field === 'email') {
      if (!email.trim()) {
        setErrors((prev) => ({ ...prev, email: 'Email address is required.' }));
      } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
        setErrors((prev) => ({ ...prev, email: 'Please enter a valid email address.' }));
      } else {
        setErrors((prev) => ({ ...prev, email: undefined }));
      }
    }

    if (field === 'password') {
      if (!password) {
        setErrors((prev) => ({ ...prev, password: 'Password is required.' }));
      } else if (password.length < 8) {
        setErrors((prev) => ({ ...prev, password: 'Password must be at least 8 characters.' }));
      } else {
        setErrors((prev) => ({ ...prev, password: undefined }));
      }
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setTouched({ username: true, email: true, password: true });
    setServerError(null);

    if (!validate()) {
      return;
    }

    setIsLoading(true);

    // Simulate registration processing for interaction state fidelity
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
              Create your account.
            </h1>
            <p className="text-sm text-[#66716B]">
              Get a clearer picture of your money.
            </p>
          </div>
        </div>

        {/* Server / Auth Error Feedback */}
        {serverError && (
          <div
            role="alert"
            className="p-3 bg-[#FDF2F2] border border-[#F3B7B7] rounded-[4px] text-xs text-[#C24141] flex items-start gap-2.5"
          >
            <AlertCircle className="w-4 h-4 text-[#C24141] shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="font-medium">Could not create account</p>
              <p className="mt-0.5 text-[#66716B]">{serverError}</p>
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
              <p className="font-medium">Account created successfully.</p>
              <p className="mt-0.5 text-[#66716B]">Setting up your workspace...</p>
            </div>
          </div>
        )}

        {/* Sign Up Form */}
        <form onSubmit={handleSubmit} noValidate className="space-y-4">
          {/* Field: Username */}
          <div className="space-y-1.5">
            <label
              htmlFor="username"
              className="block text-xs font-medium text-[#17211D]"
            >
              Username
            </label>
            <input
              id="username"
              name="username"
              type="text"
              autoComplete="username"
              disabled={isLoading || isSuccess}
              value={username}
              onChange={(e) => {
                setUsername(e.target.value);
                if (touched.username) {
                  setErrors((prev) => ({ ...prev, username: undefined }));
                }
              }}
              onBlur={() => handleBlur('username')}
              placeholder="e.g. rahul_sharma"
              aria-invalid={touched.username && !!errors.username}
              aria-describedby={errors.username ? 'username-error' : undefined}
              className={`w-full h-10 px-3 text-sm bg-white border rounded-[4px] text-[#17211D] placeholder:text-[#9BA39E] transition-colors focus:outline-none disabled:bg-[#F7F8F5] disabled:cursor-not-allowed ${
                touched.username && errors.username
                  ? 'border-[#C24141] focus:border-[#C24141] focus:ring-1 focus:ring-[#C24141]'
                  : 'border-[#E1E6E1] focus:border-[#16A765] focus:ring-1 focus:ring-[#16A765]'
              }`}
            />
            {touched.username && errors.username && (
              <p id="username-error" className="text-xs text-[#C24141]">
                {errors.username}
              </p>
            )}
          </div>

          {/* Field: Email Address */}
          <div className="space-y-1.5">
            <label
              htmlFor="email"
              className="block text-xs font-medium text-[#17211D]"
            >
              Email address
            </label>
            <input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              disabled={isLoading || isSuccess}
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                if (touched.email) {
                  setErrors((prev) => ({ ...prev, email: undefined }));
                }
              }}
              onBlur={() => handleBlur('email')}
              placeholder="name@example.com"
              aria-invalid={touched.email && !!errors.email}
              aria-describedby={errors.email ? 'email-error' : undefined}
              className={`w-full h-10 px-3 text-sm bg-white border rounded-[4px] text-[#17211D] placeholder:text-[#9BA39E] transition-colors focus:outline-none disabled:bg-[#F7F8F5] disabled:cursor-not-allowed ${
                touched.email && errors.email
                  ? 'border-[#C24141] focus:border-[#C24141] focus:ring-1 focus:ring-[#C24141]'
                  : 'border-[#E1E6E1] focus:border-[#16A765] focus:ring-1 focus:ring-[#16A765]'
              }`}
            />
            {touched.email && errors.email && (
              <p id="email-error" className="text-xs text-[#C24141]">
                {errors.email}
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
                autoComplete="new-password"
                disabled={isLoading || isSuccess}
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  if (touched.password) {
                    setErrors((prev) => ({ ...prev, password: undefined }));
                  }
                }}
                onBlur={() => handleBlur('password')}
                placeholder="Create a strong password"
                aria-invalid={touched.password && !!errors.password}
                aria-describedby={errors.password ? 'password-error' : 'password-requirements'}
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
            {touched.password && errors.password ? (
              <p id="password-error" className="text-xs text-[#C24141]">
                {errors.password}
              </p>
            ) : (
              <p id="password-requirements" className="text-[11px] text-[#66716B]">
                Must be at least 8 characters with at least one number or symbol.
              </p>
            )}
          </div>

          {/* Compact Legal Acknowledgment */}
          <div className="pt-1">
            <p className="text-xs text-[#66716B] leading-relaxed">
              By creating an account, you agree to our{' '}
              <button
                type="button"
                onClick={onNavigateToTerms}
                className="font-medium text-[#064E3B] hover:text-[#043629] hover:underline transition-colors focus:outline-none"
              >
                Terms and Conditions
              </button>{' '}
              and{' '}
              <button
                type="button"
                onClick={onNavigateToPrivacy}
                className="font-medium text-[#064E3B] hover:text-[#043629] hover:underline transition-colors focus:outline-none"
              >
                Privacy Policy
              </button>
              .
            </p>
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
                  <span>Creating account...</span>
                </>
              ) : (
                <span>Create account</span>
              )}
            </button>
          </div>
        </form>

        {/* Footer Navigation Link */}
        <div className="pt-2 border-t border-[#E1E6E1] text-center">
          <p className="text-xs text-[#66716B]">
            Already have an account?{' '}
            <button
              type="button"
              onClick={onNavigateToSignIn}
              className="font-medium text-[#064E3B] hover:text-[#043629] hover:underline transition-colors focus:outline-none"
            >
              Sign in
            </button>
          </p>
        </div>
      </div>
    </div>
  );
};
