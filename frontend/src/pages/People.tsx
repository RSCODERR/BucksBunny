import React, { useState, useEffect } from 'react';
import {
  Users,
  UserPlus,
  UserCheck,
  Link2,
  Search,
  ArrowUpRight,
  ArrowDownLeft,
  CheckCircle2,
  Trash2,
  Loader2,
  AlertCircle,
  Plus,
  Clock,
  Eye,
  Check,
  X,
} from 'lucide-react';
import {
  peopleService,
  PersonItem,
  FriendUser,
  FriendRequestItem,
} from '../services/peopleService';
import { DebtItem } from '../services/expenseService';
import { RecordRepaymentModal } from '../components/debts/RecordRepaymentModal';
import { SendFriendRequestModal } from '../components/people/SendFriendRequestModal';
import { LinkAccountModal } from '../components/people/LinkAccountModal';
import { UnlinkConfirmModal } from '../components/people/UnlinkConfirmModal';
import { PersonDetailsModal } from '../components/people/PersonDetailsModal';

interface PeopleProps {
  onOpenAddExpense: () => void;
}

type TabType = 'all' | 'friends' | 'requests';

export const People: React.FC<PeopleProps> = ({ onOpenAddExpense }) => {
  const [activeTab, setActiveTab] = useState<TabType>('all');

  // People & Friends Data
  const [people, setPeople] = useState<PersonItem[]>([]);
  const [friends, setFriends] = useState<FriendUser[]>([]);
  const [incomingRequests, setIncomingRequests] = useState<FriendRequestItem[]>([]);
  const [outgoingRequests, setOutgoingRequests] = useState<FriendRequestItem[]>([]);

  // Loading & Error States
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [successToast, setSuccessToast] = useState<string | null>(null);

  // Filters & Search
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [contactFilter, setContactFilter] = useState<'all' | 'friends' | 'manual' | 'has_balance'>('all');

  // Add Manual Person State
  const [isAddingPerson, setIsAddingPerson] = useState<boolean>(false);
  const [newPersonName, setNewPersonName] = useState<string>('');
  const [isSubmittingPerson, setIsSubmittingPerson] = useState<boolean>(false);

  // Modals Management
  const [isSendRequestOpen, setIsSendRequestOpen] = useState<boolean>(false);
  const [selectedPersonForDetails, setSelectedPersonForDetails] = useState<string | null>(null);
  const [personToLink, setPersonToLink] = useState<PersonItem | null>(null);
  const [personToUnlink, setPersonToUnlink] = useState<PersonItem | null>(null);
  const [personToDelete, setPersonToDelete] = useState<PersonItem | null>(null);
  const [isDeleting, setIsDeleting] = useState<boolean>(false);
  const [activeRepaymentDebt, setActiveRepaymentDebt] = useState<DebtItem | null>(null);

  // Request Action Loading States
  const [processingRequestId, setProcessingRequestId] = useState<string | null>(null);

  const showToast = (message: string) => {
    setSuccessToast(message);
    setTimeout(() => setSuccessToast(null), 5000);
  };

  const loadAllData = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const [peopleRes, friendsRes] = await Promise.all([
        peopleService.getPeople(),
        peopleService.getFriendsAndRequests(),
      ]);

      if (peopleRes.data?.people) {
        setPeople(peopleRes.data.people);
      }

      if (friendsRes.data) {
        setFriends(friendsRes.data.friends || []);
        setIncomingRequests(friendsRes.data.incomingRequests || []);
        setOutgoingRequests(friendsRes.data.outgoingRequests || []);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to load people and friends.';
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadAllData();
  }, []);

  const handleAddManualPerson = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = newPersonName.trim();
    if (!trimmed) return;

    try {
      setIsSubmittingPerson(true);
      const res = await peopleService.createPerson(trimmed);
      if (res.data?.person) {
        setPeople((prev) => {
          if (prev.some((p) => p.name.toLowerCase() === trimmed.toLowerCase())) {
            return prev;
          }
          return [...prev, res.data.person].sort((a, b) => a.name.localeCompare(b.name));
        });
        showToast(`Manual contact "${trimmed}" added.`);
      }
      setNewPersonName('');
      setIsAddingPerson(false);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Could not add manual person.';
      setError(msg);
    } finally {
      setIsSubmittingPerson(false);
    }
  };

  const handleDeletePerson = async (id: string, name: string) => {
    try {
      const res = await peopleService.deletePerson(id);
      showToast(res.data?.message || `"${name}" removed successfully.`);
      await loadAllData();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Could not remove person.';
      setError(msg);
    }
  };

  const handleAcceptRequest = async (requestId: string, senderUsername?: string) => {
    try {
      setProcessingRequestId(requestId);
      const res = await peopleService.acceptFriendRequest(requestId);
      showToast(res.data?.message || `You and @${senderUsername || 'friend'} are now friends.`);
      await loadAllData();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Could not accept friend request.';
      setError(msg);
    } finally {
      setProcessingRequestId(null);
    }
  };

  const handleRejectRequest = async (requestId: string) => {
    try {
      setProcessingRequestId(requestId);
      await peopleService.rejectFriendRequest(requestId);
      setIncomingRequests((prev) => prev.filter((r) => r.id !== requestId));
      showToast('Friend request declined.');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Could not decline friend request.';
      setError(msg);
    } finally {
      setProcessingRequestId(null);
    }
  };

  const handleCancelRequest = async (requestId: string) => {
    try {
      setProcessingRequestId(requestId);
      await peopleService.cancelFriendRequest(requestId);
      setOutgoingRequests((prev) => prev.filter((r) => r.id !== requestId));
      showToast('Friend request cancelled.');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Could not cancel friend request.';
      setError(msg);
    } finally {
      setProcessingRequestId(null);
    }
  };

  const handleOpenRepayment = (
    debtId: string,
    amountInPaise: number,
    amountInRupees: number,
    isReceivable: boolean,
    personName: string
  ) => {
    const debtItem: DebtItem = {
      id: debtId,
      debtorName: isReceivable ? personName : 'You',
      creditorName: isReceivable ? 'You' : personName,
      isReceivable,
      amountInPaise,
      amountInRupees,
      isSettled: false,
    };
    setActiveRepaymentDebt(debtItem);
  };

  const getInitials = (name: string) => {
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
  };

  // Filtered contacts list
  const filteredPeople = people.filter((p) => {
    const q = searchQuery.trim().toLowerCase();
    const matchesQuery =
      !q ||
      p.name.toLowerCase().includes(q) ||
      (p.linkedUser?.username && p.linkedUser.username.toLowerCase().includes(q));

    if (!matchesQuery) return false;

    if (contactFilter === 'friends') {
      return p.origin === 'friend';
    }
    if (contactFilter === 'manual') {
      return p.origin === 'manual' || !p.origin;
    }
    if (contactFilter === 'has_balance') {
      return p.hasActiveDebt && p.balanceInRupees > 0;
    }
    return true;
  });

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-[#111827] tracking-tight">
            Friends & Contacts
          </h2>
          <p className="text-xs text-[#6B7280] mt-0.5">
            Manage your registered friends, friend requests, and manual contacts for expense splits
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <button
            type="button"
            onClick={() => setIsSendRequestOpen(true)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-white hover:bg-[#F8FAF9] text-[#064E3B] text-xs font-semibold rounded-lg border border-[#CBD5E1] transition-colors cursor-pointer"
          >
            <UserPlus className="w-4 h-4 text-[#064E3B]" />
            <span>Add Friend</span>
          </button>
          <button
            type="button"
            onClick={() => setIsAddingPerson(true)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-white hover:bg-[#F8FAF9] text-[#374151] text-xs font-semibold rounded-lg border border-[#CBD5E1] transition-colors cursor-pointer"
          >
            <Plus className="w-4 h-4 text-[#4B5563]" />
            <span>Add Manual Person</span>
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
        <div className="p-3.5 bg-[#FDF2F2] border border-[#F3B7B7] rounded-lg text-xs text-[#C24141] flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-[#C24141]" />
            <span>{error}</span>
          </div>
          <button
            type="button"
            onClick={() => setError(null)}
            className="text-xs text-[#C24141] hover:underline cursor-pointer"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Inline Add Manual Person Form */}
      {isAddingPerson && (
        <form
          onSubmit={handleAddManualPerson}
          className="p-4 bg-white border border-[#CBD5E1] rounded-xl shadow-xs space-y-3"
        >
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold uppercase tracking-wider text-[#111827]">
              Add Manual Contact
            </h3>
            <button
              type="button"
              onClick={() => {
                setIsAddingPerson(false);
                setNewPersonName('');
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
              value={newPersonName}
              onChange={(e) => setNewPersonName(e.target.value)}
              placeholder="Enter name (e.g. Rahul Sharma, Priya Singh)"
              className="flex-1 px-3.5 py-2 text-sm font-semibold text-[#111827] bg-white border border-[#CBD5E1] rounded-lg focus:outline-none focus:border-[#064E3B]"
            />
            <button
              type="submit"
              disabled={isSubmittingPerson}
              className="px-4 py-2 bg-[#064E3B] hover:bg-[#04392B] text-white text-xs font-semibold rounded-lg transition-colors disabled:opacity-50 cursor-pointer"
            >
              {isSubmittingPerson ? 'Saving...' : 'Save Contact'}
            </button>
          </div>
          <p className="text-[11px] text-[#6B7280]">
            Manual contacts can be included in split expenses immediately and linked to registered BucksBunny accounts later.
          </p>
        </form>
      )}

      {/* Navigation Tabs */}
      <div className="flex items-center border-b border-[#E2E8F0] gap-6">
        <button
          type="button"
          onClick={() => setActiveTab('all')}
          className={`pb-3 text-xs font-bold flex items-center gap-2 border-b-2 transition-colors cursor-pointer ${
            activeTab === 'all'
              ? 'border-[#064E3B] text-[#064E3B]'
              : 'border-transparent text-[#6B7280] hover:text-[#111827]'
          }`}
        >
          <span>All Contacts</span>
          <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-[#E8F3EE] text-[#064E3B]">
            {people.length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('friends')}
          className={`pb-3 text-xs font-bold flex items-center gap-2 border-b-2 transition-colors cursor-pointer ${
            activeTab === 'friends'
              ? 'border-[#064E3B] text-[#064E3B]'
              : 'border-transparent text-[#6B7280] hover:text-[#111827]'
          }`}
        >
          <span>Registered Friends</span>
          <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-[#E8F3EE] text-[#064E3B]">
            {friends.length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('requests')}
          className={`pb-3 text-xs font-bold flex items-center gap-2 border-b-2 transition-colors cursor-pointer ${
            activeTab === 'requests'
              ? 'border-[#064E3B] text-[#064E3B]'
              : 'border-transparent text-[#6B7280] hover:text-[#111827]'
          }`}
        >
          <span>Friend Requests</span>
          {incomingRequests.length > 0 && (
            <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-[#DC2626] text-white font-bold">
              {incomingRequests.length}
            </span>
          )}
        </button>
      </div>

      {/* TAB 1: ALL CONTACTS */}
      {activeTab === 'all' && (
        <div className="space-y-4">
          {/* Search & Filter Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="relative flex-1 max-w-sm">
              <Search className="w-4 h-4 text-[#9CA3AF] absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search contacts..."
                className="w-full pl-9 pr-3.5 py-1.5 text-xs text-[#111827] bg-white border border-[#CBD5E1] rounded-lg focus:outline-none focus:border-[#064E3B]"
              />
            </div>

            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
              <button
                type="button"
                onClick={() => setContactFilter('all')}
                className={`px-2.5 py-1 text-[11px] font-semibold rounded-md transition-colors cursor-pointer ${
                  contactFilter === 'all'
                    ? 'bg-[#064E3B] text-white'
                    : 'bg-white border border-[#CBD5E1] text-[#4B5563] hover:bg-[#F8FAF9]'
                }`}
              >
                All ({people.length})
              </button>
              <button
                type="button"
                onClick={() => setContactFilter('friends')}
                className={`px-2.5 py-1 text-[11px] font-semibold rounded-md transition-colors cursor-pointer ${
                  contactFilter === 'friends'
                    ? 'bg-[#064E3B] text-white'
                    : 'bg-white border border-[#CBD5E1] text-[#4B5563] hover:bg-[#F8FAF9]'
                }`}
              >
                Friends ({people.filter((p) => p.origin === 'friend').length})
              </button>
              <button
                type="button"
                onClick={() => setContactFilter('manual')}
                className={`px-2.5 py-1 text-[11px] font-semibold rounded-md transition-colors cursor-pointer ${
                  contactFilter === 'manual'
                    ? 'bg-[#064E3B] text-white'
                    : 'bg-white border border-[#CBD5E1] text-[#4B5563] hover:bg-[#F8FAF9]'
                }`}
              >
                Manual Contacts ({people.filter((p) => p.origin === 'manual' || !p.origin).length})
              </button>
              <button
                type="button"
                onClick={() => setContactFilter('has_balance')}
                className={`px-2.5 py-1 text-[11px] font-semibold rounded-md transition-colors cursor-pointer ${
                  contactFilter === 'has_balance'
                    ? 'bg-[#064E3B] text-white'
                    : 'bg-white border border-[#CBD5E1] text-[#4B5563] hover:bg-[#F8FAF9]'
                }`}
              >
                Outstanding Balance ({people.filter((p) => p.hasActiveDebt && p.balanceInRupees > 0).length})
              </button>
            </div>
          </div>

          {/* People Grid */}
          {isLoading ? (
            <div className="p-12 text-center flex flex-col items-center justify-center space-y-3">
              <Loader2 className="w-6 h-6 animate-spin text-[#064E3B]" />
              <p className="text-xs text-[#6B7280]">Loading contacts and settlement balances...</p>
            </div>
          ) : filteredPeople.length === 0 ? (
            <div className="p-12 bg-white border border-[#CBD5E1] rounded-xl text-center space-y-3 shadow-xs">
              <div className="w-12 h-12 mx-auto rounded-full bg-[#E8F3EE] flex items-center justify-center text-[#064E3B]">
                <Users className="w-6 h-6" />
              </div>
              <h3 className="text-sm font-bold text-[#111827]">
                {searchQuery ? 'No contacts found' : 'No contacts added yet'}
              </h3>
              <p className="text-xs text-[#6B7280] max-w-sm mx-auto">
                {searchQuery
                  ? `No contacts matched your search for "${searchQuery}".`
                  : 'Add contacts or connect with friends to easily split expenses and track debts.'}
              </p>
              {!searchQuery && (
                <div className="flex items-center justify-center gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setIsSendRequestOpen(true)}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-[#064E3B] hover:bg-[#04392B] text-white text-xs font-semibold rounded-lg transition-colors cursor-pointer"
                  >
                    <UserPlus className="w-4 h-4" />
                    <span>Add Friend</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsAddingPerson(true)}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-white hover:bg-[#F8FAF9] text-[#374151] border border-[#CBD5E1] text-xs font-semibold rounded-lg transition-colors cursor-pointer"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Add Manual Person</span>
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
              {filteredPeople.map((person) => {
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
                          <div className="flex items-center gap-1.5">
                            <h4 className="text-sm font-bold text-[#111827]">{person.name}</h4>
                          </div>

                          <div className="flex items-center gap-1 mt-0.5">
                            {person.origin === 'friend' ? (
                              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-[#E8F5EC] text-[#064E3B] text-[10px] font-semibold rounded border border-[#A7D7B9]">
                                <UserCheck className="w-3 h-3 text-[#059669]" />
                                <span>Friend {person.linkedUser ? `(@${person.linkedUser.username})` : ''}</span>
                              </span>
                            ) : person.isLinked ? (
                              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-[#EFF6FF] text-[#1D4ED8] text-[10px] font-semibold rounded border border-[#BFDBFE]">
                                <Link2 className="w-3 h-3 text-[#2563EB]" />
                                <span>
                                  {person.linkedUser?.name ? `${person.linkedUser.name} ` : ''}(@{person.linkedUser?.username})
                                </span>
                              </span>
                            ) : (
                              <span className="inline-flex items-center px-1.5 py-0.5 bg-[#F1F5F9] text-[#475569] text-[10px] font-semibold rounded border border-[#CBD5E1]">
                                <span>Manual</span>
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => setSelectedPersonForDetails(person.id)}
                          title="View contact details"
                          className="p-1 text-[#6B7280] hover:text-[#064E3B] transition-colors cursor-pointer"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        {!hasDebt && (
                          <button
                            type="button"
                            onClick={() => setPersonToDelete(person)}
                            title={person.origin === 'friend' ? 'Remove friend' : 'Remove contact'}
                            className="p-1 text-[#9CA3AF] hover:text-[#DC2626] transition-colors cursor-pointer"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Balance Status */}
                    <div className="p-3 bg-[#F8FAF9] border border-[#E2E8F0] rounded-lg flex items-center justify-between">
                      <span className="text-xs font-semibold text-[#4B5563]">Current Balance</span>
                      {hasDebt ? (
                        <div className="text-right">
                          <span
                            className={`text-sm font-extrabold font-mono flex items-center gap-1 ${
                              person.isReceivable ? 'text-[#064E3B]' : 'text-[#DC2626]'
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

                    {/* Action Buttons */}
                    <div className="flex items-center gap-2 pt-1">
                      <button
                        type="button"
                        onClick={() => setSelectedPersonForDetails(person.id)}
                        className="flex-1 py-1.5 px-2 bg-white hover:bg-[#F8FAF9] text-[#374151] border border-[#CBD5E1] text-xs font-semibold rounded-lg transition-colors cursor-pointer text-center"
                      >
                        Details
                      </button>

                      {!person.isLinked && (person.origin === 'manual' || !person.origin) && (
                        <button
                          type="button"
                          onClick={() => setPersonToLink(person)}
                          className="flex-1 py-1.5 px-2 bg-white hover:bg-[#F8FAF9] text-[#064E3B] border border-[#CBD5E1] text-xs font-semibold rounded-lg transition-colors cursor-pointer text-center flex items-center justify-center gap-1"
                        >
                          <Link2 className="w-3.5 h-3.5" />
                          <span>Link</span>
                        </button>
                      )}

                      {hasDebt && person.debtId && (
                        <button
                          type="button"
                          onClick={() =>
                            handleOpenRepayment(
                              person.debtId!,
                              person.balanceInPaise,
                              person.balanceInRupees,
                              Boolean(person.isReceivable),
                              person.name
                            )
                          }
                          className="flex-1 py-1.5 px-2 bg-white hover:bg-[#E8F3EE] text-[#064E3B] border border-[#A7D7B9] text-xs font-semibold rounded-lg transition-colors cursor-pointer text-center"
                        >
                          Record repayment
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* TAB 2: REGISTERED FRIENDS */}
      {activeTab === 'friends' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-xs text-[#6B7280]">
              Users who have accepted your friend request on BucksBunny
            </p>
            <button
              type="button"
              onClick={() => setIsSendRequestOpen(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#064E3B] hover:bg-[#04392B] text-white text-xs font-semibold rounded-lg transition-colors cursor-pointer"
            >
              <UserPlus className="w-3.5 h-3.5" />
              <span>Add Friend</span>
            </button>
          </div>

          {isLoading ? (
            <div className="p-12 text-center flex flex-col items-center justify-center space-y-3">
              <Loader2 className="w-6 h-6 animate-spin text-[#064E3B]" />
              <p className="text-xs text-[#6B7280]">Loading friends list...</p>
            </div>
          ) : friends.length === 0 ? (
            <div className="p-12 bg-white border border-[#CBD5E1] rounded-xl text-center space-y-3 shadow-xs">
              <div className="w-12 h-12 mx-auto rounded-full bg-[#E8F3EE] flex items-center justify-center text-[#064E3B]">
                <UserCheck className="w-6 h-6" />
              </div>
              <h3 className="text-sm font-bold text-[#111827]">No registered friends yet</h3>
              <p className="text-xs text-[#6B7280] max-w-sm mx-auto">
                Connect with registered BucksBunny users by sending them a friend request using their username.
              </p>
              <button
                type="button"
                onClick={() => setIsSendRequestOpen(true)}
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#064E3B] hover:bg-[#04392B] text-white text-xs font-semibold rounded-lg transition-colors cursor-pointer"
              >
                <UserPlus className="w-4 h-4" />
                <span>Search & Add Friend</span>
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
              {friends.map((friend) => {
                const contactRecord = people.find(
                  (p) =>
                    p.linkedUser?.id === friend.id ||
                    (p.origin === 'friend' &&
                      (p.name.toLowerCase() === friend.username.toLowerCase() ||
                        (friend.name && p.name.toLowerCase() === friend.name.toLowerCase())))
                );

                const displayName = friend.name || friend.username;

                return (
                  <div
                    key={friend.id}
                    className="p-4 bg-white border border-[#CBD5E1] rounded-xl shadow-xs flex items-center justify-between gap-3 hover:border-[#94A3B8] transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-[#E8F3EE] border border-[#A7F3D0] flex items-center justify-center text-xs font-bold text-[#064E3B] shrink-0">
                        {getInitials(displayName)}
                      </div>
                      <div>
                        <h4 className="text-sm font-bold text-[#111827]">{displayName}</h4>
                        <div className="flex items-center gap-1.5 text-[11px] text-[#6B7280]">
                          <span className="font-semibold text-[#4B5563]">@{friend.username}</span>
                          <span className="inline-block w-1 h-1 rounded-full bg-[#94A3B8]" />
                          <span className="flex items-center gap-0.5 text-[#059669] font-medium">
                            <UserCheck className="w-3 h-3 text-[#059669]" />
                            Confirmed Friend
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {contactRecord && (
                        <button
                          type="button"
                          onClick={() => setSelectedPersonForDetails(contactRecord.id)}
                          className="px-2.5 py-1 text-xs font-semibold text-[#374151] hover:text-[#111827] bg-[#F8FAF9] border border-[#CBD5E1] rounded-lg transition-colors cursor-pointer"
                        >
                          Details
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={onOpenAddExpense}
                        title="Add to expense"
                        className="p-1.5 text-[#064E3B] hover:bg-[#E8F3EE] rounded-lg transition-colors cursor-pointer"
                      >
                        <Plus className="w-4 h-4" />
                      </button>
                      {contactRecord && !contactRecord.hasActiveDebt && (
                        <button
                          type="button"
                          onClick={() => setPersonToDelete(contactRecord)}
                          title="Remove friend"
                          className="p-1.5 text-[#9CA3AF] hover:text-[#DC2626] rounded-lg transition-colors cursor-pointer"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* TAB 3: FRIEND REQUESTS */}
      {activeTab === 'requests' && (
        <div className="space-y-6">
          {/* Incoming Requests */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-wider text-[#111827] flex items-center gap-2">
                <span>Incoming Requests</span>
                <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-[#E8F3EE] text-[#064E3B]">
                  {incomingRequests.length}
                </span>
              </h3>
            </div>

            {incomingRequests.length === 0 ? (
              <div className="p-8 bg-white border border-[#CBD5E1] rounded-xl text-center space-y-1 shadow-xs">
                <p className="text-xs font-semibold text-[#374151]">No pending incoming requests</p>
                <p className="text-[11px] text-[#6B7280]">
                  When someone sends you a friend request, it will appear here.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {incomingRequests.map((req) => {
                  const isProcessing = processingRequestId === req.id;
                  const senderDisplayName = req.sender?.name || req.sender?.username || 'Unknown';
                  const senderUsername = req.sender?.username || '';

                  return (
                    <div
                      key={req.id}
                      className="p-4 bg-white border border-[#CBD5E1] rounded-xl shadow-xs flex items-center justify-between gap-3"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-[#E8F3EE] border border-[#A7F3D0] flex items-center justify-center text-xs font-bold text-[#064E3B] shrink-0">
                          {getInitials(senderDisplayName)}
                        </div>
                        <div>
                          <h4 className="text-sm font-bold text-[#111827]">{senderDisplayName}</h4>
                          <div className="flex items-center gap-1.5 text-[11px] text-[#6B7280]">
                            {senderUsername && (
                              <span className="font-semibold text-[#4B5563]">@{senderUsername}</span>
                            )}
                            <span className="inline-block w-1 h-1 rounded-full bg-[#94A3B8]" />
                            <span className="flex items-center gap-0.5 text-[#6B7280]">
                              <Clock className="w-3 h-3 text-[#9CA3AF]" />
                              Pending approval
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          disabled={isProcessing}
                          onClick={() => handleAcceptRequest(req.id, senderDisplayName)}
                          className="inline-flex items-center gap-1 px-3 py-1.5 bg-[#064E3B] hover:bg-[#04392B] text-white text-xs font-semibold rounded-lg transition-colors disabled:opacity-50 cursor-pointer shadow-xs"
                        >
                          {isProcessing ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            <Check className="w-3.5 h-3.5" />
                          )}
                          <span>Accept</span>
                        </button>
                        <button
                          type="button"
                          disabled={isProcessing}
                          onClick={() => handleRejectRequest(req.id)}
                          className="inline-flex items-center gap-1 px-3 py-1.5 bg-white hover:bg-[#F8FAF9] text-[#6B7280] hover:text-[#DC2626] border border-[#CBD5E1] text-xs font-semibold rounded-lg transition-colors disabled:opacity-50 cursor-pointer"
                        >
                          <X className="w-3.5 h-3.5" />
                          <span>Decline</span>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Outgoing Requests */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-wider text-[#111827] flex items-center gap-2">
                <span>Outgoing Requests</span>
                <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-[#F1F5F9] text-[#475569]">
                  {outgoingRequests.length}
                </span>
              </h3>
            </div>

            {outgoingRequests.length === 0 ? (
              <div className="p-8 bg-white border border-[#CBD5E1] rounded-xl text-center space-y-1 shadow-xs">
                <p className="text-xs font-semibold text-[#374151]">No active outgoing requests</p>
                <p className="text-[11px] text-[#6B7280]">
                  Friend requests you have sent to others will be tracked here until accepted.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {outgoingRequests.map((req) => {
                  const isProcessing = processingRequestId === req.id;
                  const recipientDisplayName = req.recipient?.name || req.recipient?.username || 'Unknown';
                  const recipientUsername = req.recipient?.username || '';

                  return (
                    <div
                      key={req.id}
                      className="p-4 bg-white border border-[#CBD5E1] rounded-xl shadow-xs flex items-center justify-between gap-3"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-[#F1F5F9] border border-[#CBD5E1] flex items-center justify-center text-xs font-bold text-[#475569] shrink-0">
                          {getInitials(recipientDisplayName)}
                        </div>
                        <div>
                          <h4 className="text-sm font-bold text-[#111827]">{recipientDisplayName}</h4>
                          <div className="flex items-center gap-1.5 text-[11px] text-[#6B7280]">
                            {recipientUsername && (
                              <span className="font-semibold text-[#4B5563]">@{recipientUsername}</span>
                            )}
                            <span className="inline-block w-1 h-1 rounded-full bg-[#94A3B8]" />
                            <span className="flex items-center gap-0.5 text-[#6B7280]">
                              <Clock className="w-3 h-3 text-[#9CA3AF]" />
                              Awaiting response
                            </span>
                          </div>
                        </div>
                      </div>

                      <button
                        type="button"
                        disabled={isProcessing}
                        onClick={() => handleCancelRequest(req.id)}
                        className="inline-flex items-center gap-1 px-3 py-1.5 bg-white hover:bg-[#FDF2F2] text-[#6B7280] hover:text-[#DC2626] border border-[#CBD5E1] text-xs font-semibold rounded-lg transition-colors disabled:opacity-50 cursor-pointer"
                      >
                        {isProcessing ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <X className="w-3.5 h-3.5" />
                        )}
                        <span>Cancel Request</span>
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Record Repayment Modal */}
      <RecordRepaymentModal
        isOpen={Boolean(activeRepaymentDebt)}
        debt={activeRepaymentDebt}
        onClose={() => setActiveRepaymentDebt(null)}
        onRepaymentSuccess={(msg) => {
          showToast(msg);
          loadAllData();
        }}
      />

      {/* Send Friend Request Modal */}
      <SendFriendRequestModal
        isOpen={isSendRequestOpen}
        onClose={() => setIsSendRequestOpen(false)}
        onRequestSent={(msg) => {
          showToast(msg);
          loadAllData();
        }}
      />

      {/* Person Details Modal */}
      <PersonDetailsModal
        isOpen={Boolean(selectedPersonForDetails)}
        personId={selectedPersonForDetails}
        onClose={() => setSelectedPersonForDetails(null)}
        onOpenRepayment={handleOpenRepayment}
        onRequestLink={(person) => {
          setSelectedPersonForDetails(null);
          setPersonToLink(person);
        }}
        onRequestUnlink={(person) => {
          setSelectedPersonForDetails(null);
          setPersonToUnlink(person);
        }}
        onRequestDelete={(person) => {
          setSelectedPersonForDetails(null);
          setPersonToDelete(person);
        }}
      />

      {/* Link Account Modal */}
      <LinkAccountModal
        isOpen={Boolean(personToLink)}
        person={personToLink}
        onClose={() => setPersonToLink(null)}
        onLinkedSuccess={(msg) => {
          showToast(msg);
          loadAllData();
        }}
      />

      {/* Unlink Account Confirmation Modal */}
      <UnlinkConfirmModal
        isOpen={Boolean(personToUnlink)}
        person={personToUnlink}
        onClose={() => setPersonToUnlink(null)}
        onUnlinkedSuccess={(msg) => {
          showToast(msg);
          loadAllData();
        }}
      />

      {/* Delete Contact or Friend Confirmation Modal */}
      {personToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
          <div
            className="w-full max-w-md bg-white rounded-2xl shadow-xl border border-[#CBD5E1] overflow-hidden flex flex-col"
            role="dialog"
            aria-modal="true"
            aria-labelledby="delete-person-title"
          >
            <div className="px-5 py-4 border-b border-[#E2E8F0] flex items-center justify-between bg-[#FDF2F2]">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-[#FEE2E2] flex items-center justify-center text-[#DC2626]">
                  <Trash2 className="w-4 h-4" />
                </div>
                <div>
                  <h3 id="delete-person-title" className="text-sm font-bold text-[#991B1B]">
                    {personToDelete.origin === 'friend' ? 'Remove Friend' : 'Remove Contact'}
                  </h3>
                  <p className="text-[11px] text-[#B91C1C]">
                    Confirm removal
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setPersonToDelete(null)}
                className="p-1 text-[#9CA3AF] hover:text-[#111827] rounded-md transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 space-y-3">
              <p className="text-xs text-[#374151] leading-relaxed">
                {personToDelete.origin === 'friend' ? (
                  <>
                    Are you sure you want to remove <strong className="text-[#111827]">@{personToDelete.linkedUser?.username || personToDelete.name}</strong> from your friends? This will dissolve the friendship and remove them from your contacts.
                  </>
                ) : (
                  <>
                    Are you sure you want to remove contact <strong className="text-[#111827]">{personToDelete.name}</strong>? Settled past expenses will remain in your records.
                  </>
                )}
              </p>
            </div>

            <div className="px-5 py-3 border-t border-[#E2E8F0] bg-[#F8FAF9] flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setPersonToDelete(null)}
                disabled={isDeleting}
                className="px-4 py-2 text-xs font-semibold text-[#4B5563] hover:text-[#111827] bg-white border border-[#CBD5E1] rounded-lg transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isDeleting}
                onClick={async () => {
                  try {
                    setIsDeleting(true);
                    await handleDeletePerson(personToDelete.id, personToDelete.name);
                    setPersonToDelete(null);
                  } finally {
                    setIsDeleting(false);
                  }
                }}
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#DC2626] hover:bg-[#B91C1C] text-white text-xs font-semibold rounded-lg transition-colors disabled:opacity-50 cursor-pointer shadow-xs"
              >
                {isDeleting ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Removing...</span>
                  </>
                ) : (
                  <>
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>{personToDelete.origin === 'friend' ? 'Remove Friend' : 'Remove Contact'}</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
