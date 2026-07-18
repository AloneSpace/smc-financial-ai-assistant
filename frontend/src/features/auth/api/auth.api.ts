import { api } from '@/shared/lib/axios';
import type { AuthResponse, Credentials, User } from '../types';

export const authApi = {
  async register(credentials: Credentials): Promise<AuthResponse> {
    const res = await api.post<AuthResponse>('/auth/register', credentials);
    return res.data;
  },

  async login(credentials: Credentials): Promise<AuthResponse> {
    const res = await api.post<AuthResponse>('/auth/login', credentials);
    return res.data;
  },

  async me(): Promise<User> {
    const res = await api.get<User>('/auth/me');
    return res.data;
  },
};
