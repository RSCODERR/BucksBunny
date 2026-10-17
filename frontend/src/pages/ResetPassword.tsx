import React, { useState, useEffect, useRef } from 'react';
import { Loader2, AlertCircle, CheckCircle2, ArrowLeft, Eye, EyeOff, RefreshCw, Mail } from 'lucide-react';
import { authService } from '../services/authService';

interface ResetPasswordProps {
  email?: string;
  onSuccess?: () => void;
  onNavigateToSignIn?: () => void;
  onNavigateToForgotPassword?: () => void;
}

export const ResetPassword: React.FC<ResetPasswordProps> = ({
  email = '',
  onSuccess,
  onNavigateToSignIn,
  onNavigateToForgotPassword,
}) => {
  const [targetEmail, setTargetEmail] = useState(email);
  const [digits, setDigits] = useState<string[]>(['', '', '', '', '', '']);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [isLoading, setIsLoading] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [resendCooldown, setResendCooldown] = useState(60);

  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    if (email) {
      setTargetEmail(email);
    }
  }, [email]);

  useEffect(() => {
    inputRefs.current[0]?.focus();
  }, []);

  // Cooldown timer for resend
  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = setInterval(() => {
      setResendCooldown((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [resendCooldown]);

  const handleDigitChange = (index: number, value: string) => {
    setErrorMessage(null);
    const cleaned = value.replace(/\D/g, '');
    if (!cleaned) {
      const next = [...digits];
      next[index] = '';
      setDigits(next);
      return;
    }

    const digit = cleaned.slice(-1);
    const next = [...digits];
    next[index] = digit;
    setDigits(next);

    if (index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !digits[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    } else if (e.key === 'ArrowLeft' && index > 0) {
      e.preventDefault();
      inputRefs.current[index - 1]?.focus();
    } else if (e.key === 'ArrowRight' && index < 5) {
      e.preventDefault();
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    setErrorMessage(null);
    const pasted = e.clipboardData.getData('text').trim().replace(/\D/g, '');
    if (!pasted) return;

    const chars = pasted.slice(0, 6).split('');
    const next = [...digits];
    for (let i = 0; i < 6; i++) {
      next[i] = chars[i] || '';
    }
    setDigits(next);
    const nextFocus = Math.min(chars.length, 5);
    inputRefs.current[nextFocus]?.focus();
  };

  const code = digits.join('');

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!targetEmail.trim()) {
      setErrorMessage('Email address is missing. Please return to the previous screen.');
      return;
    }

    if (code.length < 6) {
      setErrorMessage('Please enter the full 6-digit verification code.');
      return;
    }

    if (!newPassword || newPassword.length < 8) {
      setErrorMessage('New password must be at least 8 characters long.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setErrorMessage('Passwords do not match. Please verify your new password.');
      return;
    }

    setIsLoading(true);

    try {
      const response = await authService.resetPassword({
        email: targetEmail.trim(),
        code: code.trim(),
        newPassword,
      });

      setSuccessMessage(response.data?.message || 'Password reset successfully. Redirecting to sign in...');

      setTimeout(() => {
        if (onSuccess) {
          onSuccess();
        } else if (onNavigateToSignIn) {
          onNavigateToSignIn();
        }
      }, 1500);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Could not reset password. Please check your code and try again.';
      setErrorMessage(msg);
    } finally {
      setIsLoading(false);
    }
  };

  const handleResend = async () => {
    if (resendCooldown > 0 || isResending) return;
    setErrorMessage(null);
    setSuccessMessage(null);

    if (!targetEmail.trim()) {
      setErrorMessage('Email address is missing.');
      return;
    }

    setIsResending(true);

    try {
      await authService.forgotPassword({ email: targetEmail.trim() });
      setSuccessMessage('A fresh 6-digit code has been sent to your email.');
      setResendCooldown(60);
      setDigits(['', '', '', '', '', '']);
      inputRefs.current[0]?.focus();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Could not resend code. Please try again.';
      setErrorMessage(msg);
    } finally {
      setIsResending(false);
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
              Create new password.
            </h1>
            <p className="text-base text-[#66716B]">
              Enter the 6-digit code sent to
            </p>
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-[#F2F7F4] border border-[#D1E3D7] rounded text-sm font-medium text-[#064E3B]">
              <Mail className="w-3.5 h-3.5 shrink-0" />
              <span className="break-all">{targetEmail || 'your email'}</span>
            </div>
          </div>
        </div>

        {/* Error Feedback */}
        {errorMessage && (
          <div
            role="alert"
            className="p-3.5 bg-[#FDF2F2] border border-[#F3B7B7] rounded-[4px] text-sm text-[#C24141] flex items-start gap-2.5"
          >
            <AlertCircle className="w-4.5 h-4.5 text-[#C24141] shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="font-semibold">Reset failed</p>
              <p className="mt-0.5 text-[#66716B]">{errorMessage}</p>
            </div>
          </div>
        )}

        {/* Success Feedback */}
        {successMessage && (
          <div
            role="status"
            className="p-3.5 bg-[#E8F5EC] border border-[#A6DEC0] rounded-[4px] text-sm text-[#064E3B] flex items-start gap-2.5"
          >
            <CheckCircle2 className="w-4.5 h-4.5 text-[#16A765] shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="font-semibold">{successMessage}</p>
            </div>
          </div>
        )}

        {/* Reset Form */}
        <form onSubmit={handleReset} noValidate className="space-y-5">
          {/* 6 Digit Verification Code */}
          <div className="space-y-2">
            <label className="block text-sm font-semibold text-[#17211D]">
              6-digit reset code
            </label>
            <div className="flex items-center justify-between gap-2 sm:gap-2.5" onPaste={handlePaste}>
              {digits.map((digit, index) => (
                <input
                  key={index}
                  ref={(el) => {
                    inputRefs.current[index] = el;
                  }}
                  type="text"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  maxLength={1}
                  value={digit}
                  onChange={(e) => handleDigitChange(index, e.target.value)}
                  onKeyDown={(e) => handleKeyDown(index, e)}
                  aria-label={`Digit ${index + 1}`}
                  className="w-12 h-14 sm:w-13 sm:h-14 text-center text-2xl font-bold font-mono text-[#17211D] bg-[#F7F8F5] border border-[#E1E6E1] rounded-md focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#064E3B] focus:border-[#064E3B] transition-all shadow-xs"
                />
              ))}
            </div>
          </div>

          {/* New Password */}
          <div className="space-y-2">
            <label htmlFor="new-password" className="block text-sm font-semibold text-[#17211D]">
              New password
            </label>
            <div className="relative">
              <input
                id="new-password"
                type={showNewPassword ? 'text' : 'password'}
                autoComplete="new-password"
                disabled={isLoading || !!successMessage}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="At least 8 characters"
                className="w-full h-11 pl-3.5 pr-11 text-base bg-white border border-[#E1E6E1] rounded-[4px] text-[#17211D] placeholder:text-[#9BA39E] focus:outline-none focus:border-[#16A765] focus:ring-1 focus:ring-[#16A765] transition-colors"
              />
              <button
                type="button"
                onClick={() => setShowNewPassword(!showNewPassword)}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#66716B] hover:text-[#17211D] transition-colors cursor-pointer"
              >
                {showNewPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
          </div>

          {/* Confirm New Password */}
          <div className="space-y-2">
            <label htmlFor="confirm-new-password" className="block text-sm font-semibold text-[#17211D]">
              Confirm new password
            </label>
            <div className="relative">
              <input
                id="confirm-new-password"
                type={showConfirmPassword ? 'text' : 'password'}
                autoComplete="new-password"
                disabled={isLoading || !!successMessage}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Re-enter your new password"
                className="w-full h-11 pl-3.5 pr-11 text-base bg-white border border-[#E1E6E1] rounded-[4px] text-[#17211D] placeholder:text-[#9BA39E] focus:outline-none focus:border-[#16A765] focus:ring-1 focus:ring-[#16A765] transition-colors"
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#66716B] hover:text-[#17211D] transition-colors cursor-pointer"
              >
                {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isLoading || code.length < 6 || !newPassword || !confirmPassword || !!successMessage}
            className="w-full h-11 bg-[#064E3B] hover:bg-[#04392B] disabled:bg-[#064E3B]/40 disabled:cursor-not-allowed text-white font-semibold text-base rounded-md transition-colors flex items-center justify-center gap-2 shadow-xs cursor-pointer mt-2"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4.5 h-4.5 animate-spin" />
                <span>Resetting password...</span>
              </>
            ) : (
              <span>Reset Password</span>
            )}
          </button>
        </form>

        {/* Resend and Navigation */}
        <div className="space-y-4 pt-1 border-t border-[#F0F2EE]">
          <div className="flex items-center justify-between text-sm">
            <span className="text-[#66716B]">Didn't receive the code?</span>
            {resendCooldown > 0 ? (
              <span className="text-[#66716B] font-medium">Resend in {resendCooldown}s</span>
            ) : (
              <button
                type="button"
                onClick={handleResend}
                disabled={isResending}
                className="text-[#064E3B] hover:text-[#04392B] font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                {isResending ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Sending...</span>
                  </>
                ) : (
                  <>
                    <RefreshCw className="w-3.5 h-3.5" />
                    <span>Resend code</span>
                  </>
                )}
              </button>
            )}
          </div>

          <div className="flex items-center justify-between pt-2 text-sm text-[#66716B]">
            {onNavigateToForgotPassword && (
              <button
                type="button"
                onClick={onNavigateToForgotPassword}
                className="text-[#064E3B] hover:underline cursor-pointer"
              >
                Change email address
              </button>
            )}
            {onNavigateToSignIn && (
              <button
                type="button"
                onClick={onNavigateToSignIn}
                className="inline-flex items-center gap-1.5 text-[#17211D] font-medium hover:text-[#064E3B] transition-colors cursor-pointer"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Back to Sign In</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
