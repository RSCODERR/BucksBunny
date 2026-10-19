import { apiClient } from './apiClient';
import { ApiResponse } from '../types/api';

export interface PersonItem {
  id: string;
  name: string;
  hasActiveDebt: boolean;
  debtId: string | null;
  balanceInPaise: number;
  balanceInRupees: number;
  isReceivable: boolean | null;
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
};
