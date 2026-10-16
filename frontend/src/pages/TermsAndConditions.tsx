import React from 'react';
import { FileText, ArrowLeft } from 'lucide-react';

interface TermsAndConditionsProps {
  onBack: () => void;
}

export const TermsAndConditions: React.FC<TermsAndConditionsProps> = ({ onBack }) => {
  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <button
        onClick={onBack}
        className="inline-flex items-center gap-2 text-xs font-medium text-neutral-400 hover:text-neutral-200 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Overview
      </button>

      <div className="surface-card p-6 sm:p-8 space-y-6">
        <div className="flex items-center gap-3 pb-4 border-b border-neutral-800">
          <div className="p-2.5 rounded-md bg-neutral-900 border border-neutral-800 text-emerald-400">
            <FileText className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-neutral-100">Terms and Conditions</h1>
            <p className="text-xs text-neutral-400">Effective date: October 2026</p>
          </div>
        </div>

        <section className="space-y-3 text-sm text-neutral-300 leading-relaxed">
          <h2 className="text-base font-semibold text-neutral-100">1. Acceptance of Terms</h2>
          <p>
            By accessing or using the BucksBunny application, you agree to be bound by these Terms and Conditions.
            If you do not agree to these terms, do not use the application.
          </p>
        </section>

        <section className="space-y-3 text-sm text-neutral-300 leading-relaxed">
          <h2 className="text-base font-semibold text-neutral-100">2. Financial Disclaimer</h2>
          <p>
            BucksBunny is a self-directed personal finance tracking tool designed to help you organize expenses, manage budgets, and record personal debts.
            BucksBunny does not provide certified financial, investment, legal, or tax advice. You remain solely responsible for your financial decisions and calculations.
          </p>
        </section>

        <section className="space-y-3 text-sm text-neutral-300 leading-relaxed">
          <h2 className="text-base font-semibold text-neutral-100">3. Account Responsibility</h2>
          <p>
            You are responsible for maintaining the confidentiality of your account credentials and environment configuration.
            You agree to notify us immediately of any unauthorized use or security compromise of your account.
          </p>
        </section>

        <section className="space-y-3 text-sm text-neutral-300 leading-relaxed">
          <h2 className="text-base font-semibold text-neutral-100">4. Permitted Use</h2>
          <p>
            You agree not to use BucksBunny for unlawful purposes, including fraudulent record-keeping, attempting unauthorized server access, or interfering with system operations.
          </p>
        </section>
      </div>
    </div>
  );
};
