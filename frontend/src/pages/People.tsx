import React, { useState, useEffect } from 'react';
import {
  Users,
  UserPlus,
  ArrowUpRight,
  ArrowDownLeft,
  CheckCircle2,
  Trash2,
  Loader2,
  AlertCircle,
  Plus,
} from 'lucide-react';
import { peopleService, PersonItem } from '../services/peopleService';
import { DebtItem } from '../services/expenseService';
import { RecordRepaymentModal } from '../components/debts/RecordRepaymentModal';

interface PeopleProps {
  onOpenAddExpense: () => void;
}

export const People: React.FC<PeopleProps> = ({ onOpenAddExpense }) => {
  const [people, setPeople] = useState<PersonItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [isAdding, setIsAdding] = useState<boolean>(false);
  const [newName, setNewName] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [activeRepaymentDebt, setActiveRepaymentDebt] = useState<DebtItem | null>(null);
  const [successToast, setSuccessToast] = useState<string | null>(null);

  const fetchPeople = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const res = await peopleService.getPeople();
      if (res.data?.people) {
        setPeople(res.data.people);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to load people.';
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchPeople();
  }, []);

  const handleAddPerson = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = newName.trim();
    if (!trimmed) return;

    try {
      setIsSubmitting(true);
      const res = await peopleService.createPerson(trimmed);
      if (res.data?.person) {
        setPeople((prev) => {
          // If already in list, do not duplicate
          if (prev.some((p) => p.name.toLowerCase() === trimmed.toLowerCase())) {
            return prev;
          }
          return [...prev, res.data.person].sort((a, b) => a.name.localeCompare(b.name));
        });
      }
      setNewName('');
      setIsAdding(false);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Could not add person.';
      setError(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOpenRepayment = (person: PersonItem) => {
    if (!person.debtId) return;
    const debtItem: DebtItem = {
      id: person.debtId,
      debtorName: person.isReceivable ? person.name : 'You',
      creditorName: person.isReceivable ? 'You' : person.name,
      isReceivable: Boolean(person.isReceivable),
      amountInPaise: person.balanceInPaise,
      amountInRupees: person.balanceInRupees,
      isSettled: false,
    };
    setActiveRepaymentDebt(debtItem);
  };

  const handleDeletePerson = async (id: string) => {
    try {
      await peopleService.deletePerson(id);
      setPeople((prev) => prev.filter((p) => p.id !== id));
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Could not remove person.';
      setError(msg);
    }
  };

  const getInitials = (name: string) => {
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-[#111827] tracking-tight">
            People & Contacts
          </h2>
          <p className="text-xs text-[#6B7280] mt-0.5">
            Keep track of people you share expenses with and manage their settlement balances
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={() => setIsAdding(true)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-white hover:bg-[#F8FAF9] text-[#064E3B] text-xs font-semibold rounded-lg border border-[#CBD5E1] transition-colors cursor-pointer"
          >
            <UserPlus className="w-4 h-4 text-[#064E3B]" />
            <span>Add Person</span>
          </button>
          <button
            type="button"
            onClick={onOpenAddExpense}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-[#064E3B] hover:bg-[#04392B] text-white text-xs font-semibold rounded-lg transition-colors cursor-pointer shadow-xs"
          >
            <Plus className="w-4 h-4" />
            <span>Add Expense</span>
          </button>
        </div>
      </div>

      {/* Success Notification */}
      {successToast && (
        <div className="p-3.5 bg-[#E8F5EC] border border-[#A6DEC0] rounded-xl text-xs font-semibold text-[#064E3B] flex items-center gap-2 shadow-xs">
          <CheckCircle2 className="w-4 h-4 text-[#059669] shrink-0" />
          <span>{successToast}</span>
        </div>
      )}

      {/* Error Banner */}
      {error && (
        <div className="p-3.5 bg-[#FDF2F2] border border-[#F3B7B7] rounded-lg text-xs text-[#C24141] flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0 text-[#C24141]" />
          <span>{error}</span>
        </div>
      )}

      {/* Inline Add Person Form */}
      {isAdding && (
        <form
          onSubmit={handleAddPerson}
          className="p-4 bg-white border border-[#CBD5E1] rounded-xl shadow-xs space-y-3"
        >
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold uppercase tracking-wider text-[#111827]">
              Add New Person
            </h3>
            <button
              type="button"
              onClick={() => {
                setIsAdding(false);
                setNewName('');
              }}
              className="text-xs text-[#6B7280] hover:text-[#111827] cursor-pointer"
            >
              Cancel
            </button>
          </div>
          <div className="flex items-center gap-2">
            <input
              type="text"
              autoFocus
              required
              maxLength={100}
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="Enter full name (e.g. Rishi Mishra, Mehul Chaurasiya)"
              className="flex-1 px-3.5 py-2 text-sm font-semibold text-[#111827] bg-white border border-[#CBD5E1] rounded-lg focus:outline-none focus:border-[#064E3B]"
            />
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-4 py-2 bg-[#064E3B] hover:bg-[#04392B] text-white text-xs font-semibold rounded-lg transition-colors disabled:opacity-50 cursor-pointer"
            >
              {isSubmitting ? 'Saving...' : 'Save Person'}
            </button>
          </div>
        </form>
      )}

      {/* People Grid / List */}
      {isLoading ? (
        <div className="p-12 text-center flex flex-col items-center justify-center space-y-3">
          <Loader2 className="w-6 h-6 animate-spin text-[#064E3B]" />
          <p className="text-xs text-[#6B7280]">Loading contacts and settlement balances...</p>
        </div>
      ) : people.length === 0 ? (
        <div className="p-12 bg-white border border-[#CBD5E1] rounded-xl text-center space-y-3 shadow-xs">
          <div className="w-12 h-12 mx-auto rounded-full bg-[#E8F3EE] flex items-center justify-center text-[#064E3B]">
            <Users className="w-6 h-6" />
          </div>
          <h3 className="text-sm font-bold text-[#111827]">No people added yet</h3>
          <p className="text-xs text-[#6B7280] max-w-sm mx-auto">
            Add your friends and roommates here. When you record a split expense, you can quickly choose them from your list.
          </p>
          <button
            type="button"
            onClick={() => setIsAdding(true)}
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#064E3B] hover:bg-[#04392B] text-white text-xs font-semibold rounded-lg transition-colors cursor-pointer"
          >
            <UserPlus className="w-4 h-4" />
            <span>Add First Person</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
          {people.map((person) => {
            const hasDebt = person.hasActiveDebt && person.balanceInRupees > 0;

            return (
              <div
                key={person.id}
                className="p-4 bg-white border border-[#CBD5E1] rounded-xl shadow-xs flex flex-col justify-between space-y-3 hover:border-[#94A3B8] transition-colors"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-[#E8F3EE] border border-[#A7F3D0] flex items-center justify-center text-xs font-bold text-[#064E3B] shrink-0">
                      {getInitials(person.name)}
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-[#111827]">{person.name}</h4>
                      <p className="text-[11px] text-[#6B7280]">
                        {hasDebt
                          ? person.isReceivable
                            ? 'Pending receivable'
                            : 'Pending payable'
                          : 'Settled up'}
                      </p>
                    </div>
                  </div>

                  {!hasDebt && (
                    <button
                      type="button"
                      onClick={() => handleDeletePerson(person.id)}
                      title="Remove person"
                      className="p-1 text-[#9CA3AF] hover:text-[#DC2626] transition-colors cursor-pointer"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>

                {/* Balance Status */}
                <div className="p-3 bg-[#F8FAF9] border border-[#E2E8F0] rounded-lg flex items-center justify-between">
                  <span className="text-xs font-semibold text-[#4B5563]">Current Balance</span>
                  {hasDebt ? (
                    <div className="text-right">
                      <span
                        className={`text-sm font-extrabold font-mono flex items-center gap-1 ${person.isReceivable ? 'text-[#064E3B]' : 'text-[#DC2626]'
                          }`}
                      >
                        {person.isReceivable ? (
                          <ArrowDownLeft className="w-3.5 h-3.5" />
                        ) : (
                          <ArrowUpRight className="w-3.5 h-3.5" />
                        )}
                        ₹{person.balanceInRupees.toFixed(2)}
                      </span>
                      <p className="text-[10px] text-[#6B7280] font-medium">
                        {person.isReceivable ? 'owes you' : 'you owe'}
                      </p>
                    </div>
                  ) : (
                    <span className="text-xs font-bold text-[#064E3B] flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5 text-[#064E3B]" />
                      <span>₹0.00 (All settled)</span>
                    </span>
                  )}
                </div>

                {/* Settle / Repayment Action */}
                {hasDebt && person.debtId && (
                  <button
                    type="button"
                    onClick={() => handleOpenRepayment(person)}
                    className="w-full py-1.5 px-3 bg-white hover:bg-[#E8F3EE] text-[#064E3B] border border-[#A7D7B9] text-xs font-semibold rounded-lg transition-colors cursor-pointer"
                  >
                    Record repayment
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Record Repayment Modal */}
      <RecordRepaymentModal
        isOpen={Boolean(activeRepaymentDebt)}
        debt={activeRepaymentDebt}
        onClose={() => setActiveRepaymentDebt(null)}
        onRepaymentSuccess={(msg) => {
          setSuccessToast(msg);
          setTimeout(() => setSuccessToast(null), 5000);
          fetchPeople();
        }}
      />
    </div>
  );
};
