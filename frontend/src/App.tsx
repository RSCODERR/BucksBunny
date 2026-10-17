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

import { AddNewExpenseModal } from './components/expenses/AddNewExpenseModal';
import { AuthUserData } from './services/authService';
import { ExpenseData } from './services/expenseService';

type PageType =
  | 'signin'
  | 'signup'
  | 'verify-email'
  | 'forgot-password'
  | 'reset-password'
  | 'privacy'
  | 'terms'
  | 'add-expense';

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
        return 'add-expense';
      }
    } catch {
      // ignore
    }
    return 'signin';
  });

  const [isModalOpen, setIsModalOpen] = useState<boolean>(true);
  const [recentSavedExpense, setRecentSavedExpense] = useState<ExpenseData | null>(null);
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
    currentPage === 'reset-password' ||
    currentPage === 'add-expense';

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
              setIsModalOpen(true);
              setCurrentPage('add-expense');
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
            <PrivacyPolicy onBack={() => setCurrentPage('signin')} />
          </div>
        )}

        {currentPage === 'terms' && (
          <div className="max-w-4xl mx-auto px-4 sm:px-6 py-10 w-full">
            <TermsAndConditions onBack={() => setCurrentPage('signin')} />
          </div>
        )}

        {currentPage === 'add-expense' && (
          currentUser ? (
            <div className="flex-1 w-full bg-[#F7F8F5] py-10 px-4 sm:px-6">
              <div className="max-w-4xl mx-auto space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#E1E6E1] pb-5">
                  <div>
                    <h1 className="text-2xl font-bold tracking-tight text-[#17211D]">
                      Personal Ledger
                    </h1>
                    <p className="text-sm text-[#66716B] mt-0.5">
                      Record transactions, manage personal expenses, and split shared costs.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(true)}
                    className="inline-flex items-center gap-2 px-4 py-2.5 bg-[#064E3B] hover:bg-[#04392B] text-white font-semibold text-sm rounded-md transition-colors shadow-xs cursor-pointer"
                  >
                    <span>+ Add New Expense</span>
                  </button>
                </div>

                {recentSavedExpense ? (
                  <div className="p-5 bg-white border border-[#E1E6E1] rounded-xl shadow-xs space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-[#064E3B] bg-[#E8F5EC] border border-[#C7E9D5] px-2 py-0.5 rounded uppercase">
                        Recently Saved
                      </span>
                      <span className="text-xs text-[#66716B]">
                        {new Date(recentSavedExpense.date).toLocaleDateString()}
                      </span>
                    </div>

                    <div className="flex items-baseline justify-between pt-1">
                      <div>
                        <h3 className="text-lg font-bold text-[#17211D]">
                          {recentSavedExpense.title}
                        </h3>
                        <p className="text-xs text-[#66716B]">
                          {recentSavedExpense.category}
                          {recentSavedExpense.merchant ? ` · ${recentSavedExpense.merchant}` : ''}
                          {recentSavedExpense.paymentMethod ? ` · ${recentSavedExpense.paymentMethod}` : ''}
                        </p>
                      </div>
                      <div className="text-right">
                        <span className="text-xl font-bold font-mono text-[#17211D]">
                          ₹ {recentSavedExpense.amountInRupees.toFixed(2)}
                        </span>
                        {recentSavedExpense.isSplit && (
                          <p className="text-[11px] font-semibold text-[#064E3B]">
                            Shared split active
                          </p>
                        )}
                      </div>
                    </div>

                    {recentSavedExpense.isSplit && recentSavedExpense.splitDetails && (
                      <div className="pt-3 border-t border-[#F0F2EE] text-xs text-[#526359] space-y-1">
                        <p>
                          <strong>Payer:</strong> {recentSavedExpense.splitDetails.payerName}
                        </p>
                        <p>
                          <strong>Your personal expense:</strong> ₹
                          {(recentSavedExpense.splitDetails.personalExpenseInPaise / 100).toFixed(2)}
                        </p>
                        {recentSavedExpense.splitDetails.owedToUserInPaise > 0 && (
                          <p className="text-[#064E3B] font-semibold">
                            Others owe you: ₹
                            {(recentSavedExpense.splitDetails.owedToUserInPaise / 100).toFixed(2)}
                          </p>
                        )}
                        {recentSavedExpense.splitDetails.userOwesInPaise > 0 && (
                          <p className="text-[#C24141] font-semibold">
                            You owe: ₹
                            {(recentSavedExpense.splitDetails.userOwesInPaise / 100).toFixed(2)}
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="p-8 bg-white border border-[#E1E6E1] rounded-xl text-center space-y-3">
                    <p className="text-sm font-semibold text-[#17211D]">
                      No expenses recorded in this session yet.
                    </p>
                    <p className="text-xs text-[#66716B] max-w-sm mx-auto">
                      Click "+ Add New Expense" to create a personal expense or split one with friends.
                    </p>
                    <button
                      type="button"
                      onClick={() => setIsModalOpen(true)}
                      className="px-4 py-2 bg-[#064E3B] hover:bg-[#04392B] text-white text-xs font-semibold rounded-md transition-colors cursor-pointer"
                    >
                      Open Expense Form
                    </button>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="min-h-[calc(100vh-72px)] w-full flex items-center justify-center py-12 px-4 sm:px-6 bg-[#F7F8F5]">
              <div className="w-full max-w-[440px] bg-white border border-[#E1E6E1] rounded-lg shadow-sm p-7 sm:p-9 text-center space-y-4">
                <h2 className="text-xl font-bold text-[#17211D]">Authentication required</h2>
                <p className="text-sm text-[#66716B]">
                  Please sign in to record and manage your personal expenses.
                </p>
                <button
                  type="button"
                  onClick={() => setCurrentPage('signin')}
                  className="w-full h-11 bg-[#064E3B] hover:bg-[#04392B] text-white font-semibold text-base rounded-md transition-colors cursor-pointer"
                >
                  Go to Sign In
                </button>
              </div>
            </div>
          )
        )}
      </main>

      {/* Centered Add New Expense Modal */}
      {currentUser && (
        <AddNewExpenseModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          onExpenseSaved={(saved) => {
            setRecentSavedExpense(saved);
          }}
          currentUser={currentUser}
        />
      )}

      <Footer currentPage={currentPage} onNavigate={(p) => setCurrentPage(p as PageType)} />
    </div>
  );
};

export default App;
