import React, { useState } from 'react';
import { Header } from './components/layout/Header';
import { Footer } from './components/layout/Footer';
import { PrivacyPolicy } from './pages/PrivacyPolicy';
import { TermsAndConditions } from './pages/TermsAndConditions';
import { SignIn } from './pages/SignIn';
import { SignUp } from './pages/SignUp';
import { EmailVerification } from './pages/EmailVerification';
import { ForgotPassword } from './pages/ForgotPassword';
import { ResetPassword } from './pages/ResetPassword';
import { Overview } from './pages/Overview';
import { Transactions } from './pages/Transactions';
import { People } from './pages/People';
import { DebtsAndDues } from './pages/DebtsAndDues';
import { Insights } from './pages/Insights';
import { DashboardLayout, DashboardTab } from './components/layout/DashboardLayout';
import { AddNewExpenseModal } from './components/expenses/AddNewExpenseModal';
import { AuthUserData } from './services/authService';

type PageType =
  | 'signin'
  | 'signup'
  | 'verify-email'
  | 'forgot-password'
  | 'reset-password'
  | 'privacy'
  | 'terms'
  | 'dashboard';

export const App: React.FC = () => {
  const [currentUser, setCurrentUser] = useState<AuthUserData | null>(() => {
    try {
      const token = localStorage.getItem('bucksbunny_token');
      const stored = localStorage.getItem('bucksbunny_user');
      if (token && stored) {
        return JSON.parse(stored);
      }
    } catch {
      return null;
    }
    return null;
  });

  const [currentPage, setCurrentPage] = useState<PageType>(() => {
    try {
      const token = localStorage.getItem('bucksbunny_token');
      if (token) {
        return 'dashboard';
      }
    } catch {
      // ignore
    }
    return 'signin';
  });

  const [activeDashboardTab, setActiveDashboardTab] = useState<DashboardTab>('overview');
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [refreshTrigger, setRefreshTrigger] = useState<number>(0);
  const [verificationEmail, setVerificationEmail] = useState<string>('');
  const [resetPasswordEmail, setResetPasswordEmail] = useState<string>('');

  const handleSignOut = () => {
    localStorage.removeItem('bucksbunny_token');
    localStorage.removeItem('bucksbunny_user');
    setCurrentUser(null);
    setIsModalOpen(false);
    setCurrentPage('signin');
  };

  const isAuthPage =
    currentPage === 'signin' ||
    currentPage === 'signup' ||
    currentPage === 'verify-email' ||
    currentPage === 'forgot-password' ||
    currentPage === 'reset-password';

  // If user is authenticated and on dashboard
  if (currentUser && currentPage === 'dashboard') {
    return (
      <DashboardLayout
        currentUser={currentUser}
        activeTab={activeDashboardTab}
        onTabChange={(tab) => setActiveDashboardTab(tab)}
        onOpenAddExpense={() => setIsModalOpen(true)}
        onSignOut={handleSignOut}
      >
        {activeDashboardTab === 'overview' ? (
          <Overview
            onOpenAddExpense={() => setIsModalOpen(true)}
            onNavigateToTab={(tab) => setActiveDashboardTab(tab)}
            refreshTrigger={refreshTrigger}
          />
        ) : activeDashboardTab === 'transactions' ? (
          <Transactions
            onOpenAddExpense={() => setIsModalOpen(true)}
            refreshTrigger={refreshTrigger}
            currentUser={currentUser}
          />
        ) : activeDashboardTab === 'debts' ? (
          <DebtsAndDues
            onOpenAddExpense={() => setIsModalOpen(true)}
            refreshTrigger={refreshTrigger}
          />
        ) : activeDashboardTab === 'people' ? (
          <People
            onOpenAddExpense={() => setIsModalOpen(true)}
          />
        ) : activeDashboardTab === 'insights' ? (
          <Insights
            onOpenAddExpense={() => setIsModalOpen(true)}
            onNavigateToTab={(tab) => setActiveDashboardTab(tab)}
            refreshTrigger={refreshTrigger}
          />
        ) : (
          <div className="p-8 sm:p-12 max-w-2xl mx-auto text-center space-y-4">
            <div className="p-6 bg-white border border-[#CBD5E1] rounded-xl shadow-xs space-y-3">
              <h3 className="text-lg font-bold text-[#111827] capitalize">
                {activeDashboardTab}
              </h3>
              <p className="text-xs text-[#6B7280]">
                This section is under active incremental development. BucksBunny is expanding systematically.
              </p>
              <button
                type="button"
                onClick={() => setActiveDashboardTab('overview')}
                className="px-4 py-2 bg-[#064E3B] hover:bg-[#04392B] text-white text-xs font-semibold rounded-lg transition-colors cursor-pointer"
              >
                Return to Overview
              </button>
            </div>
          </div>
        )}

        {/* Centered Add New Expense Modal */}
        <AddNewExpenseModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          onExpenseSaved={() => {
            setRefreshTrigger((prev) => prev + 1);
          }}
          currentUser={currentUser}
        />
      </DashboardLayout>
    );
  }

  return (
    <div
      className={`min-h-screen flex flex-col transition-colors ${
        isAuthPage ? 'bg-[#F7F8F5] text-[#17211D]' : 'bg-[#0b0f14] text-[#f0f6fc]'
      }`}
    >
      <Header
        currentPage={currentPage}
        currentUser={currentUser}
        onNavigate={(p) => setCurrentPage(p as PageType)}
        onSignOut={handleSignOut}
        onOpenAddExpenseModal={() => setIsModalOpen(true)}
      />

      <main className="flex-1 flex flex-col w-full">
        {currentPage === 'signin' && (
          <SignIn
            onNavigateToSignUp={() => setCurrentPage('signup')}
            onNavigateToForgotPassword={() => setCurrentPage('forgot-password')}
            onNavigateToVerifyEmail={(emailToVerify) => {
              if (emailToVerify) {
                setVerificationEmail(emailToVerify);
              }
              setCurrentPage('verify-email');
            }}
            onSuccess={(user) => {
              if (user) {
                setCurrentUser(user);
              }
              setCurrentPage('dashboard');
            }}
          />
        )}

        {currentPage === 'signup' && (
          <SignUp
            onNavigateToSignIn={() => setCurrentPage('signin')}
            onNavigateToTerms={() => setCurrentPage('terms')}
            onNavigateToPrivacy={() => setCurrentPage('privacy')}
            onSuccess={(registeredEmail) => {
              if (registeredEmail) {
                setVerificationEmail(registeredEmail);
              }
              setCurrentPage('verify-email');
            }}
          />
        )}

        {currentPage === 'verify-email' && (
          <EmailVerification
            email={verificationEmail}
            onVerified={() => setCurrentPage('signin')}
            onNavigateToSignIn={() => setCurrentPage('signin')}
            onNavigateToSignUp={() => setCurrentPage('signup')}
          />
        )}

        {currentPage === 'forgot-password' && (
          <ForgotPassword
            onCodeSent={(email) => {
              setResetPasswordEmail(email);
              setCurrentPage('reset-password');
            }}
            onNavigateToSignIn={() => setCurrentPage('signin')}
          />
        )}

        {currentPage === 'reset-password' && (
          <ResetPassword
            email={resetPasswordEmail}
            onSuccess={() => setCurrentPage('signin')}
            onNavigateToSignIn={() => setCurrentPage('signin')}
            onNavigateToForgotPassword={() => setCurrentPage('forgot-password')}
          />
        )}

        {currentPage === 'privacy' && (
          <div className="max-w-4xl mx-auto px-4 sm:px-6 py-10 w-full">
            <PrivacyPolicy onBack={() => setCurrentPage(currentUser ? 'dashboard' : 'signin')} />
          </div>
        )}

        {currentPage === 'terms' && (
          <div className="max-w-4xl mx-auto px-4 sm:px-6 py-10 w-full">
            <TermsAndConditions onBack={() => setCurrentPage(currentUser ? 'dashboard' : 'signin')} />
          </div>
        )}
      </main>

      {/* Centered Add New Expense Modal */}
      {currentUser && (
        <AddNewExpenseModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          onExpenseSaved={() => {
            setRefreshTrigger((prev) => prev + 1);
          }}
          currentUser={currentUser}
        />
      )}


      <Footer currentPage={currentPage} onNavigate={(p) => setCurrentPage(p as PageType)} />
    </div>
  );
};

export default App;

