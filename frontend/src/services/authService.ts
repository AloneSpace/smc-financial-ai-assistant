import { api } from '@/services/api';
import type {
  AuthResponse,
  Credentials,
  RegisterCredentials,
  UsageSummary,
  User,
} from '@/features/auth/types';

export const authService = {
  async register(credentials: RegisterCredentials): Promise<AuthResponse> {
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

  async updateProfile(payload: { name?: string }): Promise<User> {
    const res = await api.patch<User>('/auth/me', payload);
    return res.data;
  },

  async usage(): Promise<UsageSummary> {
    const res = await api.get<UsageSummary>('/usage');
    return res.data;
  },
};
