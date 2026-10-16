import React from 'react';
import { Shield, ArrowLeft } from 'lucide-react';

interface PrivacyPolicyProps {
  onBack: () => void;
}

export const PrivacyPolicy: React.FC<PrivacyPolicyProps> = ({ onBack }) => {
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
            <Shield className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-neutral-100">Privacy Policy</h1>
            <p className="text-xs text-neutral-400">Effective date: October 2026</p>
          </div>
        </div>

        <section className="space-y-3 text-sm text-neutral-300 leading-relaxed">
          <h2 className="text-base font-semibold text-neutral-100">1. Information We Collect</h2>
          <p>
            BucksBunny collects only the information necessary to provide personal finance tracking functionality.
            This includes account registration details (such as email address) and financial records that you explicitly record (such as expenses, categories, transaction amounts and loan or debt records).
          </p>
        </section>

        <section className="space-y-3 text-sm text-neutral-300 leading-relaxed">
          <h2 className="text-base font-semibold text-neutral-100">2. How Your Data Is Stored</h2>
          <p>
            Your financial records are stored securely in your configured database instance.
            Financial mutations and calculations are executed on the server, ensuring your data remains isolated and protected against unauthorized access.
          </p>
        </section>

        <section className="space-y-3 text-sm text-neutral-300 leading-relaxed">
          <h2 className="text-base font-semibold text-neutral-100">3. User Isolation and Privacy</h2>
          <p>
            BucksBunny strictly enforces user record isolation. One user cannot view, modify, or query the financial transactions or balances of another user.
            All API queries enforce server-side authentication and ownership validation.
          </p>
        </section>

        <section className="space-y-3 text-sm text-neutral-300 leading-relaxed">
          <h2 className="text-base font-semibold text-neutral-100">4. Third-Party Sharing</h2>
          <p>
            BucksBunny does not sell, rent, or trade your personal or financial data to advertising networks, data brokers, or third parties.
          </p>
        </section>

        <section className="space-y-3 text-sm text-neutral-300 leading-relaxed">
          <h2 className="text-base font-semibold text-neutral-100">5. Updates to This Policy</h2>
          <p>
            Any future revisions to this Privacy Policy will be reflected here. Continued use of BucksBunny constitutes acceptance of the updated terms.
          </p>
        </section>
      </div>
    </div>
  );
};
