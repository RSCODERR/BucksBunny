import React, { useState, useEffect, useRef } from 'react';
import { Loader2, AlertCircle, CheckCircle2, ArrowLeft, RefreshCw, Mail } from 'lucide-react';
import { authService } from '../services/authService';

interface EmailVerificationProps {
  email?: string;
  onVerified?: () => void;
  onNavigateToSignIn?: () => void;
  onNavigateToSignUp?: () => void;
}

export const EmailVerification: React.FC<EmailVerificationProps> = ({
  email = '',
  onVerified,
  onNavigateToSignIn,
  onNavigateToSignUp,
}) => {
  const [targetEmail, setTargetEmail] = useState(email);
  const [digits, setDigits] = useState<string[]>(['', '', '', '', '', '']);
  const [isLoading, setIsLoading] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [resendCooldown, setResendCooldown] = useState(60);

  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Update targetEmail if prop changes
  useEffect(() => {
    if (email) {
      setTargetEmail(email);
    }
  }, [email]);

  // Autofocus first input on load
  useEffect(() => {
    inputRefs.current[0]?.focus();
  }, []);

  // Cooldown timer for resend code
  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = setInterval(() => {
      setResendCooldown((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [resendCooldown]);

  const handleDigitChange = (index: number, value: string) => {
    setErrorMessage(null);

    // Accept only single numeric character
    const cleaned = value.replace(/\D/g, '');
    if (!cleaned) {
      const nextDigits = [...digits];
      nextDigits[index] = '';
      setDigits(nextDigits);
      return;
    }

    const digit = cleaned.slice(-1);
    const nextDigits = [...digits];
    nextDigits[index] = digit;
    setDigits(nextDigits);

    // Auto advance to next input
    if (index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace') {
      if (!digits[index] && index > 0) {
        inputRefs.current[index - 1]?.focus();
      }
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
    const pastedData = e.clipboardData.getData('text').trim().replace(/\D/g, '');
    if (!pastedData) return;

    const chars = pastedData.slice(0, 6).split('');
    const nextDigits = [...digits];
    for (let i = 0; i < 6; i++) {
      nextDigits[i] = chars[i] || '';
    }
    setDigits(nextDigits);

    // Focus last filled input or next empty
    const nextFocusIndex = Math.min(chars.length, 5);
    inputRefs.current[nextFocusIndex]?.focus();
  };

  const code = digits.join('');

  const handleVerify = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    if (!targetEmail.trim()) {
      setErrorMessage('Email address is missing. Please return to sign up.');
      return;
    }

    if (code.length < 6) {
      setErrorMessage('Please enter all 6 digits of your verification code.');
      return;
    }

    setIsLoading(true);

    try {
      const response = await authService.verifyEmail({
        email: targetEmail.trim(),
        code: code.trim(),
      });

      setSuccessMessage(response.data?.message || 'Email verified successfully.');

      setTimeout(() => {
        if (onVerified) {
          onVerified();
        } else if (onNavigateToSignIn) {
          onNavigateToSignIn();
        }
      }, 1200);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Invalid code. Please try again.';
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
      setErrorMessage('Email address is missing. Please return to sign up.');
      return;
    }

    setIsResending(true);

    try {
      await authService.resendVerification({ email: targetEmail.trim() });
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
              Verify your email.
            </h1>
            <p className="text-base text-[#66716B]">
              We sent a 6-digit verification code to
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
              <p className="font-semibold">Verification failed</p>
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
              <p className="mt-0.5 text-[#66716B]">Redirecting to sign in...</p>
            </div>
          </div>
        )}

        {/* Verification Form */}
        <form onSubmit={handleVerify} noValidate className="space-y-6">
          <div className="space-y-2.5">
            <label className="block text-sm font-semibold text-[#17211D]">
              6-digit verification code
            </label>

            {/* 6 Digit Inputs */}
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

          {/* Primary Submit Button */}
          <button
            type="submit"
            disabled={isLoading || code.length < 6}
            className="w-full h-11 bg-[#064E3B] hover:bg-[#04392B] disabled:bg-[#064E3B]/40 disabled:cursor-not-allowed text-white font-semibold text-base rounded-md transition-colors flex items-center justify-center gap-2 shadow-xs cursor-pointer"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4.5 h-4.5 animate-spin" />
                <span>Verifying...</span>
              </>
            ) : (
              <span>Verify Email</span>
            )}
          </button>
        </form>

        {/* Resend and Navigation Actions */}
        <div className="space-y-4 pt-1 border-t border-[#F0F2EE]">
          <div className="flex items-center justify-between text-sm">
            <span className="text-[#66716B]">Didn't receive the email?</span>
            {resendCooldown > 0 ? (
              <span className="text-[#66716B] font-medium">
                Resend in {resendCooldown}s
              </span>
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

          <div className="flex flex-col sm:flex-row items-center justify-between gap-2.5 pt-2 text-sm text-[#66716B]">
            {onNavigateToSignUp && (
              <button
                type="button"
                onClick={onNavigateToSignUp}
                className="text-[#064E3B] hover:underline cursor-pointer"
              >
                Entered the wrong email?
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
