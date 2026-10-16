import React from 'react';

interface HeaderProps {
  currentPage?: string;
  onNavigate?: (page: string) => void;
}

export const Header: React.FC<HeaderProps> = ({ currentPage = 'signin', onNavigate }) => {
  const isAuthPage = currentPage === 'signin' || currentPage === 'signup';

  return (
    <header
      className={`sticky top-0 z-40 w-full border-b transition-colors backdrop-blur-sm ${
        isAuthPage
          ? 'border-[#E1E6E1] bg-[#F7F8F5]/90 text-[#17211D]'
          : 'border-neutral-800 bg-neutral-950/95 text-neutral-100'
      }`}
    >
      <div className="max-w-6xl mx-auto px-4 sm:px-6 h-18 flex items-center justify-between">
        {/* Logo and Brand */}
        <div
          className="flex items-center gap-3 cursor-pointer select-none"
          onClick={() => onNavigate && onNavigate('signin')}
        >
          <img
            src="/logo.png"
            alt="BucksBunny Logo"
            className="h-10 w-10 object-contain"
          />
          <div>
            <span
              className={`font-bold text-lg sm:text-xl tracking-tight ${
                isAuthPage ? 'text-[#17211D]' : 'text-neutral-100'
              }`}
            >
              BucksBunny
            </span>
            <p
              className={`text-xs ${
                isAuthPage ? 'text-[#66716B]' : 'text-neutral-400'
              }`}
            >
              Personal finance
            </p>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex items-center gap-2 sm:gap-3">
          <button
            onClick={() => onNavigate && onNavigate('signin')}
            className={`px-3.5 py-2 text-sm font-medium rounded-md transition-colors ${
              currentPage === 'signin'
                ? isAuthPage
                  ? 'bg-[#E1E6E1] text-[#17211D] font-semibold'
                  : 'bg-neutral-800 text-neutral-100'
                : isAuthPage
                ? 'text-[#66716B] hover:text-[#17211D] hover:bg-neutral-200/60'
                : 'text-neutral-400 hover:text-neutral-200 hover:bg-neutral-900'
            }`}
          >
            Sign In
          </button>

          <button
            onClick={() => onNavigate && onNavigate('signup')}
            className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
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
