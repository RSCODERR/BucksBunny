import React, { useState, useEffect, useRef } from 'react';
import { X, Search, UserPlus, Loader2, AlertCircle } from 'lucide-react';
import { peopleService, LinkedUserInfo } from '../../services/peopleService';

interface SendFriendRequestModalProps {
  isOpen: boolean;
  onClose: () => void;
  onRequestSent: (message: string) => void;
}

export const SendFriendRequestModal: React.FC<SendFriendRequestModalProps> = ({
  isOpen,
  onClose,
  onRequestSent,
}) => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<LinkedUserInfo[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [sendingUsername, setSendingUsername] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [hasSearched, setHasSearched] = useState(false);
  const searchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!isOpen) {
      setQuery('');
      setResults([]);
      setError(null);
      setHasSearched(false);
      setSendingUsername(null);
    }
  }, [isOpen]);

  useEffect(() => {
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    const trimmed = query.trim().replace(/^@/, '');
    if (!trimmed || trimmed.length < 2) {
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
    }, 300);

    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, [query]);

  if (!isOpen) return null;

  const handleSendRequest = async (targetUser: LinkedUserInfo) => {
    try {
      setSendingUsername(targetUser.username);
      setError(null);
      const res = await peopleService.sendFriendRequest(targetUser.username);
      const successMsg = res.data?.message || `Friend request sent to @${targetUser.username}.`;
      onRequestSent(successMsg);
      onClose();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Could not send friend request.';
      setError(msg);
    } finally {
      setSendingUsername(null);
    }
  };

  const getInitials = (name: string) => {
    return name.slice(0, 2).toUpperCase();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
      <div
        className="w-full max-w-md bg-white rounded-2xl shadow-xl border border-[#CBD5E1] overflow-hidden flex flex-col max-h-[90vh]"
        role="dialog"
        aria-modal="true"
        aria-labelledby="send-request-title"
      >
        {/* Header */}
        <div className="px-5 py-4 border-b border-[#E2E8F0] flex items-center justify-between bg-[#F8FAF9]">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-[#E8F3EE] flex items-center justify-center text-[#064E3B]">
              <UserPlus className="w-4 h-4" />
            </div>
            <div>
              <h3 id="send-request-title" className="text-sm font-bold text-[#111827]">
                Send Friend Request
              </h3>
              <p className="text-[11px] text-[#6B7280]">
                Search registered BucksBunny users by username
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

        {/* Search Input */}
        <div className="p-5 border-b border-[#E2E8F0] space-y-2">
          <label htmlFor="user-search-input" className="block text-xs font-semibold text-[#374151]">
            Username
          </label>
          <div className="relative">
            <Search className="w-4 h-4 text-[#9CA3AF] absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              id="user-search-input"
              type="text"
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="e.g. rahul, ananya, mohan"
              className="w-full pl-9 pr-8 py-2 text-sm text-[#111827] placeholder-[#9CA3AF] bg-white border border-[#CBD5E1] rounded-lg focus:outline-none focus:border-[#064E3B] font-medium"
            />
            {isSearching && (
              <Loader2 className="w-4 h-4 animate-spin text-[#064E3B] absolute right-3 top-1/2 -translate-y-1/2" />
            )}
          </div>
          <p className="text-[11px] text-[#6B7280]">
            Enter at least 2 characters to search for registered accounts.
          </p>
        </div>

        {/* Error Notification */}
        {error && (
          <div className="mx-5 mt-4 p-3 bg-[#FDF2F2] border border-[#F3B7B7] rounded-lg text-xs text-[#C24141] flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-[#C24141]" />
            <span>{error}</span>
          </div>
        )}

        {/* Results Area */}
        <div className="p-5 flex-1 overflow-y-auto space-y-2.5 min-h-[160px]">
          {isSearching ? (
            <div className="py-8 text-center flex flex-col items-center justify-center space-y-2 text-[#6B7280]">
              <Loader2 className="w-5 h-5 animate-spin text-[#064E3B]" />
              <p className="text-xs">Searching registered users...</p>
            </div>
          ) : results.length > 0 ? (
            <div className="space-y-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-[#6B7280]">
                Matching Accounts ({results.length})
              </span>
              {results.map((user) => {
                const isSending = sendingUsername === user.username;
                return (
                  <div
                    key={user.id}
                    className="p-3 bg-[#F8FAF9] border border-[#E2E8F0] rounded-xl flex items-center justify-between gap-3 hover:border-[#CBD5E1] transition-colors"
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="w-9 h-9 rounded-full bg-[#E8F3EE] border border-[#A7F3D0] flex items-center justify-center text-xs font-bold text-[#064E3B]">
                        {getInitials(user.name || user.username)}
                      </div>
                      <div>
                        <div className="text-sm font-bold text-[#111827]">
                          {user.name || user.username}
                        </div>
                        <div className="text-[11px] text-[#6B7280]">
                          @{user.username}
                        </div>
                      </div>
                    </div>
                    <button
                      type="button"
                      disabled={isSending}
                      onClick={() => handleSendRequest(user)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#064E3B] hover:bg-[#04392B] text-white text-xs font-semibold rounded-lg transition-colors disabled:opacity-50 cursor-pointer shadow-xs"
                    >
                      {isSending ? (
                        <>
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          <span>Sending...</span>
                        </>
                      ) : (
                        <>
                          <UserPlus className="w-3.5 h-3.5" />
                          <span>Send Request</span>
                        </>
                      )}
                    </button>
                  </div>
                );
              })}
            </div>
          ) : hasSearched ? (
            <div className="py-8 text-center space-y-1 text-[#6B7280]">
              <p className="text-xs font-semibold text-[#374151]">No registered users found</p>
              <p className="text-[11px]">
                No verified accounts matched your search for "{query}".
              </p>
            </div>
          ) : (
            <div className="py-8 text-center space-y-1 text-[#6B7280]">
              <p className="text-xs font-medium text-[#4B5563]">
                Connect with friends on BucksBunny
              </p>
              <p className="text-[11px] max-w-xs mx-auto">
                Once a friend accepts your request, they will appear in your friends list and can be included in shared expenses.
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-[#E2E8F0] bg-[#F8FAF9] flex justify-end">
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
