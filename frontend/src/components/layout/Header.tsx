import React from 'react';

interface HeaderProps {
  currentPage?: string;
  onNavigate?: (page: string) => void;
}

export const Header: React.FC<HeaderProps> = ({ currentPage = 'overview', onNavigate }) => {
  const isAuthPage = currentPage === 'signin' || currentPage === 'signup';

  return (
    <header
      className={`sticky top-0 z-40 w-full border-b transition-colors backdrop-blur-sm ${
        isAuthPage
          ? 'border-[#E1E6E1] bg-[#F7F8F5]/90 text-[#17211D]'
          : 'border-neutral-800 bg-neutral-950/95 text-neutral-100'
      }`}
    >
      <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
        {/* Logo and Brand */}
        <div
          className="flex items-center gap-3 cursor-pointer select-none"
          onClick={() => onNavigate && onNavigate('overview')}
        >
          <img
            src="/logo.png"
            alt="BucksBunny Logo"
            className="h-8 w-8 object-contain"
          />
          <div>
            <span
              className={`font-semibold text-base tracking-tight ${
                isAuthPage ? 'text-[#17211D]' : 'text-neutral-100'
              }`}
            >
              BucksBunny
            </span>
            <p
              className={`text-[11px] ${
                isAuthPage ? 'text-[#66716B]' : 'text-neutral-400'
              }`}
            >
              Personal finance
            </p>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex items-center gap-1 sm:gap-2">
          <button
            onClick={() => onNavigate && onNavigate('overview')}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
              isAuthPage
                ? 'text-[#66716B] hover:text-[#17211D] hover:bg-neutral-200/60'
                : currentPage === 'overview'
                ? 'bg-neutral-800 text-neutral-100'
                : 'text-neutral-400 hover:text-neutral-200 hover:bg-neutral-900'
            }`}
          >
            Overview
          </button>

          <button
            onClick={() => onNavigate && onNavigate('signin')}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
              isAuthPage
                ? currentPage === 'signin'
                  ? 'bg-[#E1E6E1] text-[#17211D] font-semibold'
                  : 'text-[#66716B] hover:text-[#17211D] hover:bg-neutral-200/60'
                : currentPage === 'signin'
                ? 'bg-neutral-800 text-neutral-100'
                : 'text-neutral-400 hover:text-neutral-200 hover:bg-neutral-900'
            }`}
          >
            Sign In
          </button>

          <button
            onClick={() => onNavigate && onNavigate('signup')}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
              currentPage === 'signup'
                ? 'bg-[#043629] text-white shadow-xs'
                : 'bg-[#064E3B] text-white hover:bg-[#043629]'
            }`}
          >
            Sign Up
          </button>
        </nav>
      </div>
    </header>
  );
};
