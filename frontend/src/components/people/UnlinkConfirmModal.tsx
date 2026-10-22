import React, { useState } from 'react';
import { X, Link2Off, Loader2, AlertCircle, ShieldAlert } from 'lucide-react';
import { peopleService, PersonItem } from '../../services/peopleService';

interface UnlinkConfirmModalProps {
  isOpen: boolean;
  person: PersonItem | null;
  onClose: () => void;
  onUnlinkedSuccess: (message: string, updatedPerson: PersonItem) => void;
}

export const UnlinkConfirmModal: React.FC<UnlinkConfirmModalProps> = ({
  isOpen,
  person,
  onClose,
  onUnlinkedSuccess,
}) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen || !person) return null;

  const handleConfirmUnlink = async () => {
    try {
      setIsSubmitting(true);
      setError(null);
      const res = await peopleService.unlinkPersonAccount(person.id);
      const msg = res.data?.message || `Successfully unlinked account from "${person.name}".`;
      if (res.data?.person) {
        onUnlinkedSuccess(msg, res.data.person);
      } else {
        onUnlinkedSuccess(msg, {
          ...person,
          isLinked: false,
          linkedUser: null,
          isUnlinkable: false,
        });
      }
      onClose();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Could not unlink account.';
      setError(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const username = person.linkedUser?.username ? `@${person.linkedUser.username}` : 'the registered account';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
      <div
        className="w-full max-w-md bg-white rounded-2xl shadow-xl border border-[#CBD5E1] overflow-hidden flex flex-col"
        role="dialog"
        aria-modal="true"
        aria-labelledby="unlink-modal-title"
      >
        {/* Header */}
        <div className="px-5 py-4 border-b border-[#E2E8F0] flex items-center justify-between bg-[#FDF2F2]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#FEE2E2] flex items-center justify-center text-[#DC2626]">
              <Link2Off className="w-4 h-4" />
            </div>
            <div>
              <h3 id="unlink-modal-title" className="text-sm font-bold text-[#991B1B]">
                Unlink Registered Account
              </h3>
              <p className="text-[11px] text-[#B91C1C]">
                Confirm account detachment
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 text-[#9CA3AF] hover:text-[#111827] rounded-md transition-colors cursor-pointer"
            aria-label="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 space-y-4">
          <p className="text-xs text-[#374151] leading-relaxed">
            Are you sure you want to unlink <span className="font-semibold text-[#111827]">{username}</span> from contact <span className="font-semibold text-[#111827]">{person.name}</span>?
          </p>

          <div className="p-3.5 bg-[#F8FAF9] border border-[#CBD5E1] rounded-xl flex items-start gap-2.5 text-xs text-[#4B5563]">
            <ShieldAlert className="w-4 h-4 text-[#064E3B] shrink-0 mt-0.5" />
            <div className="space-y-1">
              <p className="font-semibold text-[#111827]">Financial history is preserved</p>
              <p className="text-[11px] text-[#6B7280]">
                All historical expenses, split amounts, debts, and settlement records for <strong className="font-semibold text-[#374151]">{person.name}</strong> will remain intact. This person will revert to a manual contact and can be relinked later if needed.
              </p>
            </div>
          </div>

          {error && (
            <div className="p-3 bg-[#FDF2F2] border border-[#F3B7B7] rounded-lg text-xs text-[#C24141] flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-[#C24141]" />
              <span>{error}</span>
            </div>
          )}
        </div>

        {/* Actions Footer */}
        <div className="px-5 py-3 border-t border-[#E2E8F0] bg-[#F8FAF9] flex items-center justify-end gap-2.5">
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="px-4 py-2 text-xs font-semibold text-[#4B5563] hover:text-[#111827] bg-white border border-[#CBD5E1] rounded-lg transition-colors cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={isSubmitting}
            onClick={handleConfirmUnlink}
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#DC2626] hover:bg-[#B91C1C] text-white text-xs font-semibold rounded-lg transition-colors disabled:opacity-50 cursor-pointer shadow-xs"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Unlinking...</span>
              </>
            ) : (
              <>
                <Link2Off className="w-3.5 h-3.5" />
                <span>Unlink Account</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
