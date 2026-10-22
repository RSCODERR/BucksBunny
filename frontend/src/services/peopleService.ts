import { apiClient } from './apiClient';
import { ApiResponse } from '../types/api';

export type PersonOrigin = 'manual' | 'friend';

export interface LinkedUserInfo {
  id: string;
  name?: string;
  username: string;
}

export interface PersonItem {
  id: string;
  name: string;
  origin: PersonOrigin;
  isLinked: boolean;
  linkedUser: LinkedUserInfo | null;
  isUnlinkable: boolean;
  hasActiveDebt: boolean;
  debtId: string | null;
  balanceInPaise: number;
  balanceInRupees: number;
  isReceivable: boolean | null;
}

export interface FriendUser {
  id: string;
  name: string;
  username: string;
  becameFriendsAt?: string;
}

export interface FriendRequestItem {
  id: string;
  sender?: LinkedUserInfo;
  recipient?: LinkedUserInfo;
  status: 'pending' | 'accepted' | 'rejected' | 'cancelled';
  expiresAt: string;
  createdAt: string;
}

export interface FriendsAndRequestsData {
  friends: FriendUser[];
  incomingRequests: FriendRequestItem[];
  outgoingRequests: FriendRequestItem[];
}

export interface SharedExpenseHistoryItem {
  id: string;
  title: string;
  merchant?: string;
  item?: string;
  category: string;
  date: string;
  formattedDate: string;
  totalAmountInRupees: number;
  theirShareInRupees: number;
}

export interface PersonDetailsData {
  person: {
    id: string;
    name: string;
    origin: PersonOrigin;
    isLinked: boolean;
    linkedUser: LinkedUserInfo | null;
    isUnlinkable: boolean;
    linkedAt: string | null;
    createdAt: string;
  };
  balance: {
    hasActiveDebt: boolean;
    debtId: string | null;
    balanceInPaise: number;
    balanceInRupees: number;
    isReceivable: boolean | null;
  };
  sharedExpenses: SharedExpenseHistoryItem[];
}

export interface PeopleResponseData {
  people: PersonItem[];
  count: number;
}

export const peopleService = {
  getPeople: async (): Promise<ApiResponse<PeopleResponseData>> => {
    return apiClient<ApiResponse<PeopleResponseData>>('/people', {
      method: 'GET',
    });
  },

  createPerson: async (name: string): Promise<ApiResponse<{ message: string; person: PersonItem }>> => {
    return apiClient<ApiResponse<{ message: string; person: PersonItem }>>('/people', {
      method: 'POST',
      body: JSON.stringify({ name }),
    });
  },

  deletePerson: async (id: string): Promise<ApiResponse<{ message: string; id: string }>> => {
    return apiClient<ApiResponse<{ message: string; id: string }>>(`/people/${id}`, {
      method: 'DELETE',
    });
  },

  getFriendsAndRequests: async (): Promise<ApiResponse<FriendsAndRequestsData>> => {
    return apiClient<ApiResponse<FriendsAndRequestsData>>('/people/friends', {
      method: 'GET',
    });
  },

  searchRegisteredUsers: async (query: string): Promise<ApiResponse<{ users: LinkedUserInfo[] }>> => {
    return apiClient<ApiResponse<{ users: LinkedUserInfo[] }>>(
      `/people/search-users?query=${encodeURIComponent(query)}`,
      { method: 'GET' }
    );
  },

  sendFriendRequest: async (targetUsername: string): Promise<ApiResponse<{ message: string; request?: FriendRequestItem }>> => {
    return apiClient<ApiResponse<{ message: string; request?: FriendRequestItem }>>('/people/friends/request', {
      method: 'POST',
      body: JSON.stringify({ recipientUsername: targetUsername }),
    });
  },

  acceptFriendRequest: async (requestId: string): Promise<ApiResponse<{ message: string }>> => {
    return apiClient<ApiResponse<{ message: string }>>(`/people/friends/request/${requestId}/accept`, {
      method: 'POST',
    });
  },

  rejectFriendRequest: async (requestId: string): Promise<ApiResponse<{ message: string }>> => {
    return apiClient<ApiResponse<{ message: string }>>(`/people/friends/request/${requestId}/reject`, {
      method: 'POST',
    });
  },

  cancelFriendRequest: async (requestId: string): Promise<ApiResponse<{ message: string }>> => {
    return apiClient<ApiResponse<{ message: string }>>(`/people/friends/request/${requestId}/cancel`, {
      method: 'DELETE',
    });
  },

  linkPersonToAccount: async (personId: string, targetUsername: string): Promise<ApiResponse<{ message: string; person: PersonItem }>> => {
    return apiClient<ApiResponse<{ message: string; person: PersonItem }>>(`/people/${personId}/link`, {
      method: 'PATCH',
      body: JSON.stringify({ targetUsername }),
    });
  },

  unlinkPersonAccount: async (personId: string): Promise<ApiResponse<{ message: string; person: PersonItem }>> => {
    return apiClient<ApiResponse<{ message: string; person: PersonItem }>>(`/people/${personId}/unlink`, {
      method: 'PATCH',
    });
  },

  getPersonDetails: async (personId: string): Promise<ApiResponse<PersonDetailsData>> => {
    return apiClient<ApiResponse<PersonDetailsData>>(`/people/${personId}/details`, {
      method: 'GET',
    });
  },
};

