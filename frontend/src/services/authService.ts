import { api } from '@/services/api';
import type { AuthResponse, Credentials, User } from '@/features/auth/types';

export const authService = {
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
