import React, { useState } from 'react';
import { Header } from './components/layout/Header';
import { Footer } from './components/layout/Footer';
import { HealthStatusCard } from './components/health/HealthStatusCard';
import { PrivacyPolicy } from './pages/PrivacyPolicy';
import { TermsAndConditions } from './pages/TermsAndConditions';
import { SignIn } from './pages/SignIn';
import { SignUp } from './pages/SignUp';
import {
  Wallet,
  PieChart,
  Users,
  CheckCircle2,
} from 'lucide-react';

export const App: React.FC = () => {
  const [currentPage, setCurrentPage] = useState<'overview' | 'privacy' | 'terms' | 'signin' | 'signup'>('signin');

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
            onSuccess={() => setCurrentPage('overview')}
          />
        )}

        {currentPage === 'signup' && (
          <SignUp
            onNavigateToSignIn={() => setCurrentPage('signin')}
            onNavigateToTerms={() => setCurrentPage('terms')}
            onNavigateToPrivacy={() => setCurrentPage('privacy')}
            onSuccess={() => setCurrentPage('overview')}
          />
        )}

        {currentPage === 'privacy' && (
          <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 w-full">
            <PrivacyPolicy onBack={() => setCurrentPage('overview')} />
          </div>
        )}

        {currentPage === 'terms' && (
          <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 w-full">
            <TermsAndConditions onBack={() => setCurrentPage('overview')} />
          </div>
        )}

        {currentPage === 'overview' && (
          <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 w-full space-y-8">
            {/* Product Identity Header */}
            <div className="surface-card p-6 sm:p-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
              <div className="flex items-start gap-4">
                <img
                  src="/logo.png"
                  alt="BucksBunny Logo"
                  className="w-14 h-14 object-contain shrink-0"
                />
                <div className="space-y-1">
                  <h1 className="text-2xl sm:text-3xl font-bold text-neutral-100 tracking-tight">
                    BucksBunny
                  </h1>
                  <p className="text-sm text-neutral-400 max-w-xl leading-relaxed">
                    Understand your spending, track expenses, manage budgets and keep track of money you owe others or are owed.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 self-stretch sm:self-auto">
                <div className="px-3 py-1.5 rounded-md bg-emerald-950/40 border border-emerald-800/60 text-emerald-300 text-xs font-medium flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Foundation Ready</span>
                </div>
              </div>
            </div>

            {/* Core Product Pillars */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Pillar 1: Expenses */}
              <div className="surface-card p-5 space-y-2.5">
                <div className="w-9 h-9 rounded-md bg-neutral-900 border border-neutral-800 flex items-center justify-center text-emerald-400">
                  <Wallet className="w-4 h-4" />
                </div>
                <h3 className="text-sm font-semibold text-neutral-100">
                  Expense Tracking
                </h3>
                <p className="text-xs text-neutral-400 leading-relaxed">
                  Record daily expenditures with clear categorization. All calculations are executed on the server using precise monetary representation.
                </p>
              </div>

              {/* Pillar 2: Budgets */}
              <div className="surface-card p-5 space-y-2.5">
                <div className="w-9 h-9 rounded-md bg-neutral-900 border border-neutral-800 flex items-center justify-center text-emerald-400">
                  <PieChart className="w-4 h-4" />
                </div>
                <h3 className="text-sm font-semibold text-neutral-100">
                  Monthly Budgets
                </h3>
                <p className="text-xs text-neutral-400 leading-relaxed">
                  Set realistic category limits and monitor your spending pace throughout the billing cycle without unnecessary distractions.
                </p>
              </div>

              {/* Pillar 3: Debts & Split */}
              <div className="surface-card p-5 space-y-2.5">
                <div className="w-9 h-9 rounded-md bg-neutral-900 border border-neutral-800 flex items-center justify-center text-emerald-400">
                  <Users className="w-4 h-4" />
                </div>
                <h3 className="text-sm font-semibold text-neutral-100">
                  Money Owed & Lending
                </h3>
                <p className="text-xs text-neutral-400 leading-relaxed">
                  Keep clear, transparent records of balances owed to friends or owed back to you. Settle transactions with full audit history.
                </p>
              </div>
            </div>

            {/* Live Infrastructure Service Health */}
            <section aria-label="System Status">
              <HealthStatusCard />
            </section>
          </div>
        )}
      </main>

      <Footer currentPage={currentPage} onNavigate={(p) => setCurrentPage(p as typeof currentPage)} />
    </div>
  );
};

export default App;
