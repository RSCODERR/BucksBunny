import React, { useState } from 'react';
import { Eye, EyeOff, Loader2, AlertCircle, CheckCircle2 } from 'lucide-react';
import { authService } from '../services/authService';

interface SignUpProps {
  onNavigateToSignIn?: () => void;
  onNavigateToTerms?: () => void;
  onNavigateToPrivacy?: () => void;
  onSuccess?: (email: string) => void;
}

export const SignUp: React.FC<SignUpProps> = ({
  onNavigateToSignIn,
  onNavigateToTerms,
  onNavigateToPrivacy,
  onSuccess,
}) => {
  const [name, setName] = useState('');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // Interaction states
  const [errors, setErrors] = useState<{
    name?: string;
    username?: string;
    email?: string;
    password?: string;
    agreedToTerms?: string;
  }>({});
  const [touched, setTouched] = useState<{
    name?: boolean;
    username?: boolean;
    email?: boolean;
    password?: boolean;
    agreedToTerms?: boolean;
  }>({});
  const [serverError, setServerError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const validate = (): boolean => {
    const newErrors: {
      name?: string;
      username?: string;
      email?: string;
      password?: string;
      agreedToTerms?: string;
    } = {};

    if (!name.trim()) {
      newErrors.name = 'Full name is required.';
    } else if (name.trim().length < 2) {
      newErrors.name = 'Full name must be at least 2 characters.';
    }

    if (!username.trim()) {
      newErrors.username = 'Username is required.';
    } else if (username.trim().length < 3) {
      newErrors.username = 'Username must be at least 3 characters.';
    } else if (!/^(?=.*\d)[a-zA-Z0-9_]{3,20}$/.test(username.trim())) {
      newErrors.username = 'Username must contain at least one number and only letters, numbers, and underscores (e.g. rahul_07).';
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

    // Mandatory checkbox validation
    if (!agreedToTerms) {
      newErrors.agreedToTerms = 'You must agree to the Terms and Conditions and Privacy Policy to proceed.';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleBlur = (field: 'name' | 'username' | 'email' | 'password') => {
    setTouched((prev) => ({ ...prev, [field]: true }));

    if (field === 'name') {
      if (!name.trim()) {
        setErrors((prev) => ({ ...prev, name: 'Full name is required.' }));
      } else if (name.trim().length < 2) {
        setErrors((prev) => ({ ...prev, name: 'Full name must be at least 2 characters.' }));
      } else {
        setErrors((prev) => ({ ...prev, name: undefined }));
      }
    }

    if (field === 'username') {
      if (!username.trim()) {
        setErrors((prev) => ({ ...prev, username: 'Username is required.' }));
      } else if (username.trim().length < 3) {
        setErrors((prev) => ({ ...prev, username: 'Username must be at least 3 characters.' }));
      } else if (!/^(?=.*\d)[a-zA-Z0-9_]{3,20}$/.test(username.trim())) {
        setErrors((prev) => ({
          ...prev,
          username: 'Username must contain at least one number (e.g. rahul_07).',
        }));
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setTouched({ name: true, username: true, email: true, password: true, agreedToTerms: true });
    setServerError(null);

    if (!validate()) {
      return;
    }

    setIsLoading(true);

    try {
      // Sends registration payload including the mandatory agreedToTerms value to the backend
      await authService.signUp({
        name: name.trim(),
        username: username.trim(),
        email: email.trim(),
        password,
        agreedToTerms,
      });

      setIsSuccess(true);
      if (onSuccess) {
        setTimeout(() => onSuccess(email.trim()), 700);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Could not create account. Please try again.';
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
              Create your account.
            </h1>
            <p className="text-base text-[#66716B]">
              Get a clearer picture of your money.
            </p>
          </div>
        </div>

        {/* Server / Auth Error Feedback */}
        {serverError && (
          <div
            role="alert"
            className="p-3.5 bg-[#FDF2F2] border border-[#F3B7B7] rounded-[4px] text-sm text-[#C24141] flex items-start gap-2.5"
          >
            <AlertCircle className="w-4.5 h-4.5 text-[#C24141] shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="font-semibold">Could not create account</p>
              <p className="mt-0.5 text-[#66716B]">{serverError}</p>
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
              <p className="font-semibold">Account created successfully.</p>
              <p className="mt-0.5 text-[#66716B]">Setting up your workspace...</p>
            </div>
          </div>
        )}

        {/* Sign Up Form */}
        <form onSubmit={handleSubmit} noValidate className="space-y-5">
          {/* Field: Full Name */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label
                htmlFor="name"
                className="block text-sm font-semibold text-[#17211D]"
              >
                Full Name
              </label>
              <span className="text-[11px] text-[#66716B]">Displayed to your friends</span>
            </div>
            <input
              id="name"
              name="name"
              type="text"
              autoComplete="name"
              disabled={isLoading || isSuccess}
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                if (touched.name) {
                  setErrors((prev) => ({ ...prev, name: undefined }));
                }
              }}
              onBlur={() => handleBlur('name')}
              placeholder="e.g. Rahul Sharma"
              aria-invalid={touched.name && !!errors.name}
              aria-describedby={errors.name ? 'name-error' : undefined}
              className={`w-full h-11 px-3.5 text-base bg-white border rounded-[4px] text-[#17211D] placeholder:text-[#9BA39E] transition-colors focus:outline-none disabled:bg-[#F7F8F5] disabled:cursor-not-allowed ${
                touched.name && errors.name
                  ? 'border-[#C24141] focus:border-[#C24141] focus:ring-1 focus:ring-[#C24141]'
                  : 'border-[#E1E6E1] focus:border-[#16A765] focus:ring-1 focus:ring-[#16A765]'
              }`}
            />
            {touched.name && errors.name && (
              <p id="name-error" className="text-sm text-[#C24141]">
                {errors.name}
              </p>
            )}
          </div>

          {/* Field: Username */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label
                htmlFor="username"
                className="block text-sm font-semibold text-[#17211D]"
              >
                Username
              </label>
              <span className="text-[11px] text-[#66716B]">Must include numbers</span>
            </div>
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
              placeholder="e.g. rahul_07"
              aria-invalid={touched.username && !!errors.username}
              aria-describedby={errors.username ? 'username-error' : undefined}
              className={`w-full h-11 px-3.5 text-base bg-white border rounded-[4px] text-[#17211D] placeholder:text-[#9BA39E] transition-colors focus:outline-none disabled:bg-[#F7F8F5] disabled:cursor-not-allowed ${
                touched.username && errors.username
                  ? 'border-[#C24141] focus:border-[#C24141] focus:ring-1 focus:ring-[#C24141]'
                  : 'border-[#E1E6E1] focus:border-[#16A765] focus:ring-1 focus:ring-[#16A765]'
              }`}
            />
            {touched.username && errors.username && (
              <p id="username-error" className="text-sm text-[#C24141]">
                {errors.username}
              </p>
            )}
          </div>

          {/* Field: Email Address */}
          <div className="space-y-2">
            <label
              htmlFor="email"
              className="block text-sm font-semibold text-[#17211D]"
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
              className={`w-full h-11 px-3.5 text-base bg-white border rounded-[4px] text-[#17211D] placeholder:text-[#9BA39E] transition-colors focus:outline-none disabled:bg-[#F7F8F5] disabled:cursor-not-allowed ${
                touched.email && errors.email
                  ? 'border-[#C24141] focus:border-[#C24141] focus:ring-1 focus:ring-[#C24141]'
                  : 'border-[#E1E6E1] focus:border-[#16A765] focus:ring-1 focus:ring-[#16A765]'
              }`}
            />
            {touched.email && errors.email && (
              <p id="email-error" className="text-sm text-[#C24141]">
                {errors.email}
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
            {touched.password && errors.password ? (
              <p id="password-error" className="text-sm text-[#C24141]">
                {errors.password}
              </p>
            ) : (
              <p id="password-requirements" className="text-xs sm:text-[13px] text-[#66716B]">
                Must be at least 8 characters with at least one number or symbol.
              </p>
            )}
          </div>

          {/* Mandatory Checkbox to Proceed */}
          <div className="space-y-1.5 pt-1">
            <label className="flex items-start gap-2.5 cursor-pointer select-none">
              <input
                id="agreedToTerms"
                name="agreedToTerms"
                type="checkbox"
                checked={agreedToTerms}
                disabled={isLoading || isSuccess}
                onChange={(e) => {
                  setAgreedToTerms(e.target.checked);
                  if (touched.agreedToTerms && e.target.checked) {
                    setErrors((prev) => ({ ...prev, agreedToTerms: undefined }));
                  }
                }}
                className={`mt-1 h-4.5 w-4.5 rounded-[3px] text-[#064E3B] focus:ring-[#16A765] accent-[#064E3B] cursor-pointer shrink-0 ${
                  touched.agreedToTerms && errors.agreedToTerms
                    ? 'border-[#C24141]'
                    : 'border-[#E1E6E1]'
                }`}
              />
              <span className="text-sm text-[#66716B] leading-relaxed">
                I agree to the{' '}
                <button
                  type="button"
                  onClick={onNavigateToTerms}
                  className="font-semibold text-[#064E3B] hover:text-[#043629] hover:underline transition-colors focus:outline-none cursor-pointer"
                >
                  Terms and Conditions
                </button>{' '}
                and{' '}
                <button
                  type="button"
                  onClick={onNavigateToPrivacy}
                  className="font-semibold text-[#064E3B] hover:text-[#043629] hover:underline transition-colors focus:outline-none cursor-pointer"
                >
                  Privacy Policy
                </button>
                .{' '}
                <span className="text-[#C24141] font-bold" title="Mandatory agreement">*</span>
              </span>
            </label>
            {touched.agreedToTerms && errors.agreedToTerms && (
              <p id="terms-error" className="text-sm text-[#C24141] pl-7">
                {errors.agreedToTerms}
              </p>
            )}
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
                  <span>Creating account...</span>
                </>
              ) : (
                <span>Create account</span>
              )}
            </button>
          </div>
        </form>

        {/* Footer Navigation Link */}
        <div className="pt-3 border-t border-[#E1E6E1] text-center">
          <p className="text-sm text-[#66716B]">
            Already have an account?{' '}
            <button
              type="button"
              onClick={onNavigateToSignIn}
              className="font-semibold text-[#064E3B] hover:text-[#043629] hover:underline transition-colors focus:outline-none cursor-pointer"
            >
              Sign in
            </button>
          </p>
        </div>
      </div>
    </div>
  );
};
