import React, { useState } from 'react';
import { Header } from './components/layout/Header';
import { Footer } from './components/layout/Footer';
import { PrivacyPolicy } from './pages/PrivacyPolicy';
import { TermsAndConditions } from './pages/TermsAndConditions';
import { SignIn } from './pages/SignIn';
import { SignUp } from './pages/SignUp';

export const App: React.FC = () => {
  const [currentPage, setCurrentPage] = useState<'signin' | 'signup' | 'privacy' | 'terms'>('signin');

  const isAuthPage = currentPage === 'signin' || currentPage === 'signup';

  return (
    <div
      className={`min-h-screen flex flex-col transition-colors ${
        isAuthPage ? 'bg-[#F7F8F5] text-[#17211D]' : 'bg-[#0b0f14] text-[#f0f6fc]'
      }`}
    >
      <Header currentPage={currentPage} onNavigate={(p) => setCurrentPage(p as typeof currentPage)} />

      <main className="flex-1 flex flex-col w-full">
        {currentPage === 'signin' && (
          <SignIn
            onNavigateToSignUp={() => setCurrentPage('signup')}
            onNavigateToForgotPassword={() => {}}
            onSuccess={() => {}}
          />
        )}

        {currentPage === 'signup' && (
          <SignUp
            onNavigateToSignIn={() => setCurrentPage('signin')}
            onNavigateToTerms={() => setCurrentPage('terms')}
            onNavigateToPrivacy={() => setCurrentPage('privacy')}
            onSuccess={() => setCurrentPage('signin')}
          />
        )}

        {currentPage === 'privacy' && (
          <div className="max-w-4xl mx-auto px-4 sm:px-6 py-10 w-full">
            <PrivacyPolicy onBack={() => setCurrentPage('signin')} />
          </div>
        )}

        {currentPage === 'terms' && (
          <div className="max-w-4xl mx-auto px-4 sm:px-6 py-10 w-full">
            <TermsAndConditions onBack={() => setCurrentPage('signin')} />
          </div>
        )}
      </main>

      <Footer currentPage={currentPage} onNavigate={(p) => setCurrentPage(p as typeof currentPage)} />
    </div>
  );
};

export default App;
