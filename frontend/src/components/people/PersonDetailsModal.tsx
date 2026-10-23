import React, { useState, useEffect } from 'react';
import {
  X,
  UserCheck,
  Link2,
  Link2Off,
  Receipt,
  ArrowUpRight,
  ArrowDownLeft,
  CheckCircle2,
  Loader2,
  AlertCircle,
  Calendar,
  Tag,
  Trash2,
} from 'lucide-react';
import {
  peopleService,
  PersonDetailsData,
  PersonItem,
} from '../../services/peopleService';

interface PersonDetailsModalProps {
  isOpen: boolean;
  personId: string | null;
  onClose: () => void;
  onOpenRepayment: (
    debtId: string,
    balanceInPaise: number,
    balanceInRupees: number,
    isReceivable: boolean,
    personName: string
  ) => void;
  onRequestLink: (person: PersonItem) => void;
  onRequestUnlink: (person: PersonItem) => void;
  onRequestDelete?: (person: PersonItem) => void;
}

export const PersonDetailsModal: React.FC<PersonDetailsModalProps> = ({
  isOpen,
  personId,
  onClose,
  onOpenRepayment,
  onRequestLink,
  onRequestUnlink,
  onRequestDelete,
}) => {
  const [details, setDetails] = useState<PersonDetailsData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && personId) {
      loadDetails(personId);
    } else {
      setDetails(null);
      setError(null);
    }
  }, [isOpen, personId]);

  const loadDetails = async (id: string) => {
    try {
      setIsLoading(true);
      setError(null);
      const res = await peopleService.getPersonDetails(id);
      if (res.data) {
        setDetails(res.data);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to load contact details.';
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  const getInitials = (name: string) => {
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
  };

  const person = details?.person;
  const balance = details?.balance;
  const sharedExpenses = details?.sharedExpenses || [];

  const asPersonItem = (): PersonItem | null => {
    if (!person || !balance) return null;
    return {
      id: person.id,
      name: person.name,
      origin: person.origin,
      isLinked: person.isLinked,
      linkedUser: person.linkedUser,
      isUnlinkable: person.isUnlinkable,
      hasActiveDebt: balance.hasActiveDebt,
      debtId: balance.debtId,
      balanceInPaise: balance.balanceInPaise,
      balanceInRupees: balance.balanceInRupees,
      isReceivable: balance.isReceivable,
    };
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
      <div
        className="w-full max-w-xl bg-white rounded-2xl shadow-xl border border-[#CBD5E1] overflow-hidden flex flex-col max-h-[90vh]"
        role="dialog"
        aria-modal="true"
        aria-labelledby="person-details-title"
      >
        {/* Header */}
        <div className="px-6 py-5 border-b border-[#E2E8F0] flex items-center justify-between bg-[#F8FAF9]">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-full bg-[#E8F3EE] border border-[#A7F3D0] flex items-center justify-center text-sm font-bold text-[#064E3B] shrink-0">
              {person ? getInitials(person.name) : '...'}
            </div>
            <div>
              <h3 id="person-details-title" className="text-base font-bold text-[#111827]">
                {person ? person.name : 'Loading Contact Details...'}
              </h3>
              {person && (
                <div className="flex items-center gap-2 mt-0.5">
                  {person.origin === 'friend' ? (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-[#E8F5EC] text-[#064E3B] text-[11px] font-semibold rounded-md border border-[#A7D7B9]">
                      <UserCheck className="w-3 h-3 text-[#059669]" />
                      <span>Registered Friend {person.linkedUser ? `(@${person.linkedUser.username})` : ''}</span>
                    </span>
                  ) : person.isLinked ? (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-[#EFF6FF] text-[#1D4ED8] text-[11px] font-semibold rounded-md border border-[#BFDBFE]">
                      <Link2 className="w-3 h-3 text-[#2563EB]" />
                      <span>Linked: {person.linkedUser?.name ? `${person.linkedUser.name} ` : ''}(@{person.linkedUser?.username})</span>
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-[#F1F5F9] text-[#475569] text-[11px] font-semibold rounded-md border border-[#CBD5E1]">
                      <span>Manual Contact</span>
                    </span>
                  )}
                </div>
              )}
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

        {/* Modal Body */}
        <div className="p-6 flex-1 overflow-y-auto space-y-5">
          {isLoading ? (
            <div className="py-12 text-center flex flex-col items-center justify-center space-y-2 text-[#6B7280]">
              <Loader2 className="w-6 h-6 animate-spin text-[#064E3B]" />
              <p className="text-xs">Loading contact information and shared history...</p>
            </div>
          ) : error ? (
            <div className="p-4 bg-[#FDF2F2] border border-[#F3B7B7] rounded-xl text-xs text-[#C24141] flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-[#C24141]" />
              <span>{error}</span>
            </div>
          ) : details && person && balance ? (
            <>
              {/* Outstanding Settlement Balance Card */}
              <div className="p-4 bg-[#F8FAF9] border border-[#CBD5E1] rounded-xl space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-[#6B7280]">
                    Settlement Balance
                  </span>
                  {balance.hasActiveDebt && balance.isReceivable !== null && (
                    <span
                      className={`text-[11px] font-semibold px-2 py-0.5 rounded ${
                        balance.isReceivable
                          ? 'bg-[#E8F5EC] text-[#064E3B]'
                          : 'bg-[#FDF2F2] text-[#DC2626]'
                      }`}
                    >
                      {balance.isReceivable ? 'You are owed' : 'You owe'}
                    </span>
                  )}
                </div>

                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                  {balance.hasActiveDebt && balance.balanceInRupees > 0 ? (
                    <div className="flex items-baseline gap-1.5">
                      <span
                        className={`text-2xl font-extrabold font-mono flex items-center gap-1 ${
                          balance.isReceivable ? 'text-[#064E3B]' : 'text-[#DC2626]'
                        }`}
                      >
                        {balance.isReceivable ? (
                          <ArrowDownLeft className="w-5 h-5" />
                        ) : (
                          <ArrowUpRight className="w-5 h-5" />
                        )}
                        ₹{balance.balanceInRupees.toFixed(2)}
                      </span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 text-xs font-bold text-[#064E3B]">
                      <CheckCircle2 className="w-4 h-4 text-[#064E3B]" />
                      <span>All settled up (₹0.00 outstanding)</span>
                    </div>
                  )}

                  {balance.hasActiveDebt && balance.debtId && (
                    <button
                      type="button"
                      onClick={() => {
                        onClose();
                        onOpenRepayment(
                          balance.debtId!,
                          balance.balanceInPaise,
                          balance.balanceInRupees,
                          Boolean(balance.isReceivable),
                          person.name
                        );
                      }}
                      className="w-full sm:w-auto px-3.5 py-1.5 bg-[#064E3B] hover:bg-[#04392B] text-white text-xs font-semibold rounded-lg transition-colors cursor-pointer shadow-xs text-center"
                    >
                      Record Repayment
                    </button>
                  )}
                </div>
              </div>

              {/* Account Association & Linking Section */}
              <div className="p-4 bg-white border border-[#CBD5E1] rounded-xl space-y-3">
                <span className="text-xs font-bold uppercase tracking-wider text-[#6B7280]">
                  Account Association
                </span>

                {person.origin === 'friend' ? (
                  <div className="flex items-start justify-between gap-3 text-xs text-[#374151]">
                    <div className="space-y-1">
                      <p className="font-semibold text-[#111827]">
                        Connected Registered Friend
                      </p>
                      <p className="text-[11px] text-[#6B7280] leading-relaxed">
                        This person is a confirmed BucksBunny friend linked to their registered account (@{person.linkedUser?.username}). Friendships are permanent connections and cannot be unlinked through manual contact settings.
                      </p>
                    </div>
                  </div>
                ) : person.isLinked && person.linkedUser ? (
                  <div className="space-y-3">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                      <div>
                        <div className="font-semibold text-[#111827]">
                          Linked Registered Account
                        </div>
                        <div className="text-[11px] text-[#6B7280]">
                          Associated with <strong className="text-[#111827]">@{person.linkedUser.username}</strong>
                        </div>
                      </div>
                      {person.isUnlinkable && (
                        <button
                          type="button"
                          onClick={() => {
                            const pItem = asPersonItem();
                            if (pItem) onRequestUnlink(pItem);
                          }}
                          className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 px-3 py-1.5 bg-[#FDF2F2] hover:bg-[#FEE2E2] text-[#DC2626] border border-[#FCA5A5] text-xs font-semibold rounded-lg transition-colors cursor-pointer"
                        >
                          <Link2Off className="w-3.5 h-3.5" />
                          <span>Unlink Account</span>
                        </button>
                      )}
                    </div>
                    <p className="text-[11px] text-[#6B7280] leading-relaxed">
                      This contact was manually created and subsequently linked to @{person.linkedUser.username}. Unlinking will return the contact to manual status while leaving all existing expenses and debt records intact.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                      <div>
                        <div className="font-semibold text-[#111827]">
                          Manual Contact (Not Linked)
                        </div>
                        <div className="text-[11px] text-[#6B7280]">
                          Available for local expense splits and debt tracking
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          const pItem = asPersonItem();
                          if (pItem) onRequestLink(pItem);
                        }}
                        className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 px-3 py-1.5 bg-white hover:bg-[#F8FAF9] text-[#064E3B] border border-[#CBD5E1] text-xs font-semibold rounded-lg transition-colors cursor-pointer"
                      >
                        <Link2 className="w-3.5 h-3.5" />
                        <span>Link Account</span>
                      </button>
                    </div>
                    <p className="text-[11px] text-[#6B7280] leading-relaxed">
                      If this person creates or already has a registered BucksBunny account, you can link them here to sync future expenses.
                    </p>
                  </div>
                )}
              </div>

              {/* Shared Expenses History */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-[#6B7280]">
                    Shared Expense History
                  </h4>
                  <span className="text-[11px] text-[#6B7280]">
                    {sharedExpenses.length} recent record{sharedExpenses.length === 1 ? '' : 's'}
                  </span>
                </div>

                {sharedExpenses.length === 0 ? (
                  <div className="p-6 bg-[#F8FAF9] border border-[#CBD5E1] rounded-xl text-center space-y-1.5">
                    <Receipt className="w-5 h-5 mx-auto text-[#9CA3AF]" />
                    <p className="text-xs font-semibold text-[#374151]">No shared expenses yet</p>
                    <p className="text-[11px] text-[#6B7280]">
                      Expenses split with {person.name} will appear here.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {sharedExpenses.map((exp) => (
                      <div
                        key={exp.id}
                        className="p-3 bg-[#F8FAF9] border border-[#E2E8F0] rounded-xl flex items-center justify-between gap-3"
                      >
                        <div className="space-y-0.5">
                          <p className="text-xs font-bold text-[#111827]">{exp.title}</p>
                          <div className="flex items-center gap-2 text-[11px] text-[#6B7280]">
                            <span className="flex items-center gap-1">
                              <Calendar className="w-3 h-3 text-[#9CA3AF]" />
                              <span>{exp.formattedDate}</span>
                            </span>
                            <span>•</span>
                            <span className="flex items-center gap-1">
                              <Tag className="w-3 h-3 text-[#9CA3AF]" />
                              <span>{exp.category}</span>
                            </span>
                          </div>
                        </div>

                        <div className="text-right">
                          <div className="text-xs font-bold font-mono text-[#111827]">
                            ₹{exp.theirShareInRupees.toFixed(2)}
                          </div>
                          <div className="text-[10px] text-[#6B7280]">
                            of ₹{exp.totalAmountInRupees.toFixed(2)} total
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          ) : null}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-[#E2E8F0] bg-[#F8FAF9] flex items-center justify-between gap-2">
          {onRequestDelete && person && (!balance?.hasActiveDebt || balance.balanceInRupees === 0) ? (
            <button
              type="button"
              onClick={() => {
                const pItem = asPersonItem();
                if (pItem) {
                  onClose();
                  onRequestDelete(pItem);
                }
              }}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-[#DC2626] hover:bg-[#FEE2E2] rounded-lg border border-[#FCA5A5] transition-colors cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>{person.origin === 'friend' ? 'Remove Friend' : 'Remove Contact'}</span>
            </button>
          ) : (
            <span className="text-[11px] text-[#9CA3AF]">
              {balance?.hasActiveDebt && balance.balanceInRupees > 0
                ? 'Settle active balance to remove contact'
                : ''}
            </span>
          )}

          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-[#4B5563] hover:text-[#111827] bg-white border border-[#CBD5E1] rounded-lg transition-colors cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
