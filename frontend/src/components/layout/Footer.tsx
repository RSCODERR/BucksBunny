import React from 'react';

interface FooterProps {
  currentPage?: string;
  onNavigate?: (page: string) => void;
}

export const Footer: React.FC<FooterProps> = ({ currentPage, onNavigate }) => {
  const isAuthPage = currentPage === 'signin' || currentPage === 'signup';

  return (
    <footer
      className={`border-t transition-colors mt-auto py-6 ${
        isAuthPage
          ? 'border-[#E1E6E1] bg-[#F7F8F5] text-[#66716B]'
          : 'border-neutral-800 bg-neutral-950 text-neutral-400'
      }`}
    >
      <div className="max-w-6xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs">
        <div className="flex items-center gap-2">
          <img src="/logo.png" alt="BucksBunny" className="h-5 w-5 object-contain" />
          <span>BucksBunny. Personal finance management.</span>
        </div>
        <div className="flex items-center gap-4">
          <button
            onClick={() => onNavigate && onNavigate('privacy')}
            className={`transition-colors ${
              isAuthPage ? 'hover:text-[#17211D]' : 'hover:text-neutral-200'
            }`}
          >
            Privacy Policy
          </button>
          <span>·</span>
          <button
            onClick={() => onNavigate && onNavigate('terms')}
            className={`transition-colors ${
              isAuthPage ? 'hover:text-[#17211D]' : 'hover:text-neutral-200'
            }`}
          >
            Terms and Conditions
          </button>
        </div>
      </div>
    </footer>
  );
};
