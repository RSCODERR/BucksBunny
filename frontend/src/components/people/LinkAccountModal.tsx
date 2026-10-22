import React, { useState, useEffect, useRef } from 'react';
import { X, Search, Link2, Loader2, AlertCircle, ShieldCheck, UserCheck } from 'lucide-react';
import { peopleService, LinkedUserInfo, PersonItem, FriendUser } from '../../services/peopleService';

interface LinkAccountModalProps {
  isOpen: boolean;
  person: PersonItem | null;
  onClose: () => void;
  onLinkedSuccess: (message: string, updatedPerson: PersonItem) => void;
}

export const LinkAccountModal: React.FC<LinkAccountModalProps> = ({
  isOpen,
  person,
  onClose,
  onLinkedSuccess,
}) => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<LinkedUserInfo[]>([]);
  const [friends, setFriends] = useState<FriendUser[]>([]);
  const [isLoadingFriends, setIsLoadingFriends] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedUser, setSelectedUser] = useState<LinkedUserInfo | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasSearched, setHasSearched] = useState(false);
  const searchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Load existing friends on modal open
  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setResults([]);
      setSelectedUser(null);
      setError(null);
      setHasSearched(false);
      setIsSubmitting(false);

      setIsLoadingFriends(true);
      peopleService
        .getFriendsAndRequests()
        .then((res) => {
          if (res.data?.friends) {
            setFriends(res.data.friends);
          }
        })
        .catch(() => {})
        .finally(() => setIsLoadingFriends(false));
    }
  }, [isOpen]);

  useEffect(() => {
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    const trimmed = query.trim().replace(/^@/, '');
    if (!trimmed) {
      setResults([]);
      setIsSearching(false);
      setHasSearched(false);
      return;
    }

    setIsSearching(true);
    setError(null);

    searchTimeoutRef.current = setTimeout(async () => {
      try {
        const res = await peopleService.searchRegisteredUsers(trimmed);
        if (res.data?.users) {
          setResults(res.data.users);
        } else {
          setResults([]);
        }
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Error searching registered users.';
        setError(msg);
        setResults([]);
      } finally {
        setIsSearching(false);
        setHasSearched(true);
      }
    }, 200);

    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, [query]);

  if (!isOpen || !person) return null;

  const handleConfirmLink = async () => {
    if (!selectedUser) return;

    try {
      setIsSubmitting(true);
      setError(null);
      const res = await peopleService.linkPersonToAccount(person.id, selectedUser.username);
      const successMsg = res.data?.message || `Successfully linked "${person.name}" to @${selectedUser.username}.`;
      if (res.data?.person) {
        onLinkedSuccess(successMsg, res.data.person);
      } else {
        onLinkedSuccess(successMsg, {
          ...person,
          isLinked: true,
          linkedUser: selectedUser,
          isUnlinkable: true,
        });
      }
      onClose();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Could not link account.';
      setError(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const getInitials = (name: string) => {
    return name.slice(0, 2).toUpperCase();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
      <div
        className="w-full max-w-lg bg-white rounded-2xl shadow-xl border border-[#CBD5E1] overflow-hidden flex flex-col max-h-[90vh]"
        role="dialog"
        aria-modal="true"
        aria-labelledby="link-modal-title"
      >
        {/* Header */}
        <div className="px-5 py-4 border-b border-[#E2E8F0] flex items-center justify-between bg-[#F8FAF9]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#E8F3EE] flex items-center justify-center text-[#064E3B]">
              <Link2 className="w-4 h-4" />
            </div>
            <div>
              <h3 id="link-modal-title" className="text-sm font-bold text-[#111827]">
                Link Contact to Registered Account
              </h3>
              <p className="text-[11px] text-[#6B7280]">
                Connecting contact: <span className="font-semibold text-[#111827]">{person.name}</span>
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

        {/* Informative Notice */}
        <div className="px-5 py-3.5 bg-[#F0FDF4] border-b border-[#DCFCE7] flex items-start gap-2.5">
          <ShieldCheck className="w-4 h-4 text-[#16A34A] shrink-0 mt-0.5" />
          <p className="text-xs text-[#166534] leading-relaxed">
            Linking will connect <strong className="font-semibold">{person.name}</strong> to a registered BucksBunny account. All previous expenses, split amounts, and repayment records remain completely preserved.
          </p>
        </div>

        {/* Search Input */}
        <div className="p-5 border-b border-[#E2E8F0] space-y-2">
          <label htmlFor="registered-user-search" className="block text-xs font-semibold text-[#374151]">
            Search Registered Account by Username
          </label>
          <div className="relative">
            <Search className="w-4 h-4 text-[#9CA3AF] absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              id="registered-user-search"
              type="text"
              autoFocus
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setSelectedUser(null);
              }}
              placeholder="Type username (e.g. exoskull, rahul, priya)..."
              className="w-full pl-9 pr-8 py-2 text-sm text-[#111827] placeholder-[#9CA3AF] bg-white border border-[#CBD5E1] rounded-lg focus:outline-none focus:border-[#064E3B] font-medium"
            />
            {isSearching && (
              <Loader2 className="w-4 h-4 animate-spin text-[#064E3B] absolute right-3 top-1/2 -translate-y-1/2" />
            )}
          </div>
        </div>

        {/* Error Notification */}
        {error && (
          <div className="mx-5 mt-4 p-3 bg-[#FDF2F2] border border-[#F3B7B7] rounded-lg text-xs text-[#C24141] flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-[#C24141]" />
            <span>{error}</span>
          </div>
        )}

        {/* Content Area */}
        <div className="p-5 flex-1 overflow-y-auto space-y-3 min-h-[160px]">
          {selectedUser ? (
            <div className="p-4 bg-[#F8FAF9] border-2 border-[#064E3B] rounded-xl flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-[#E8F3EE] border border-[#A7F3D0] flex items-center justify-center text-xs font-bold text-[#064E3B]">
                  {getInitials(selectedUser.name || selectedUser.username)}
                </div>
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-sm font-bold text-[#111827]">{selectedUser.name || selectedUser.username}</span>
                    <span className="px-1.5 py-0.5 bg-[#E8F3EE] text-[#064E3B] text-[10px] font-semibold rounded">
                      Selected
                    </span>
                  </div>
                  <p className="text-[11px] text-[#6B7280]">
                    @{selectedUser.username} · Linking to contact <strong className="text-[#111827]">{person.name}</strong>
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedUser(null)}
                className="text-xs text-[#6B7280] hover:text-[#111827] underline cursor-pointer"
              >
                Change
              </button>
            </div>
          ) : isSearching ? (
            <div className="py-8 text-center flex flex-col items-center justify-center space-y-2 text-[#6B7280]">
              <Loader2 className="w-5 h-5 animate-spin text-[#064E3B]" />
              <p className="text-xs">Searching registered users...</p>
            </div>
          ) : results.length > 0 ? (
            <div className="space-y-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-[#6B7280]">
                Matching Accounts ({results.length})
              </span>
              {results.map((user) => (
                <div
                  key={user.id}
                  onClick={() => setSelectedUser(user)}
                  className="p-3 bg-[#F8FAF9] border border-[#E2E8F0] hover:border-[#064E3B] rounded-xl flex items-center justify-between gap-3 cursor-pointer transition-colors"
                >
                  <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-full bg-[#E8F3EE] border border-[#A7F3D0] flex items-center justify-center text-xs font-bold text-[#064E3B]">
                      {getInitials(user.name || user.username)}
                    </div>
                    <div>
                      <div className="text-sm font-bold text-[#111827]">{user.name || user.username}</div>
                      <div className="text-[11px] text-[#6B7280]">@{user.username}</div>
                    </div>
                  </div>
                  <span className="text-xs font-semibold text-[#064E3B]">Select</span>
                </div>
              ))}
            </div>
          ) : hasSearched ? (
            <div className="py-8 text-center space-y-1 text-[#6B7280]">
              <p className="text-xs font-semibold text-[#374151]">No accounts found</p>
              <p className="text-[11px]">No registered users matched "{query}".</p>
            </div>
          ) : (
            <div className="space-y-3">
              {isLoadingFriends ? (
                <div className="py-2 flex items-center justify-center gap-2 text-xs text-[#6B7280]">
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-[#064E3B]" />
                  <span>Loading registered friends...</span>
                </div>
              ) : friends.length > 0 ? (
                <div className="space-y-2">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-[#6B7280] flex items-center gap-1.5">
                    <UserCheck className="w-3.5 h-3.5 text-[#059669]" />
                    <span>Quick Select From Friends ({friends.length})</span>
                  </span>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {friends.map((friend) => (
                      <div
                        key={friend.id}
                        onClick={() => setSelectedUser({ id: friend.id, name: friend.name, username: friend.username })}
                        className="p-2.5 bg-[#F8FAF9] border border-[#E2E8F0] hover:border-[#064E3B] rounded-xl flex items-center justify-between gap-2 cursor-pointer transition-colors"
                      >
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-full bg-[#E8F3EE] border border-[#A7F3D0] flex items-center justify-center text-xs font-bold text-[#064E3B] shrink-0">
                            {getInitials(friend.name || friend.username)}
                          </div>
                          <div>
                            <div className="text-xs font-bold text-[#111827]">{friend.name || friend.username}</div>
                            <div className="text-[10px] text-[#6B7280]">@{friend.username}</div>
                          </div>
                        </div>
                        <span className="text-[11px] font-semibold text-[#064E3B]">Select</span>
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}

              <div className="py-4 text-center space-y-1 text-[#6B7280]">
                <p className="text-xs font-medium text-[#4B5563]">Find the registered account</p>
                <p className="text-[11px] max-w-xs mx-auto">
                  Type any username above to link <span className="font-semibold text-[#111827]">{person.name}</span> to their registered BucksBunny account.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Confirmation Footer */}
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
            disabled={!selectedUser || isSubmitting}
            onClick={handleConfirmLink}
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#064E3B] hover:bg-[#04392B] text-white text-xs font-semibold rounded-lg transition-colors disabled:opacity-50 cursor-pointer shadow-xs"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Linking Account...</span>
              </>
            ) : (
              <>
                <Link2 className="w-3.5 h-3.5" />
                <span>Confirm & Link Account</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
