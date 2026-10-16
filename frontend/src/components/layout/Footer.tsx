import React from 'react';

interface FooterProps {
  currentPage?: string;
  onNavigate?: (page: string) => void;
}

export const Footer: React.FC<FooterProps> = ({ currentPage, onNavigate }) => {
  const isAuthPage = currentPage === 'signin' || currentPage === 'signup';

  return (
    <footer
      className={`border-t transition-colors mt-auto py-6 sm:py-8 ${
        isAuthPage
          ? 'border-[#E1E6E1] bg-[#F7F8F5] text-[#66716B]'
          : 'border-neutral-800 bg-neutral-950 text-neutral-400'
      }`}
    >
      <div className="max-w-6xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-sm sm:text-base">
        <div className="flex items-center gap-2.5">
          <img src="/logo.png" alt="BucksBunny" className="h-6 w-6 object-contain" />
          <span>BucksBunny. Personal finance management.</span>
        </div>
        <div className="flex items-center gap-4 text-sm">
          <button
            onClick={() => onNavigate && onNavigate('privacy')}
            className={`transition-colors cursor-pointer ${
              isAuthPage ? 'hover:text-[#17211D]' : 'hover:text-neutral-200'
            }`}
          >
            Privacy Policy
          </button>
          <span>·</span>
          <button
            onClick={() => onNavigate && onNavigate('terms')}
            className={`transition-colors cursor-pointer ${
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
