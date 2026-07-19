import { create } from 'zustand';
import { authService } from '@/services/authService';
import { clearToken, getToken, setToken } from '@/utils/token';
import type { Credentials, RegisterCredentials, User } from '@/features/auth/types';

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  /** True during the initial token-validation check on app load. */
  isInitializing: boolean;
  /** Verify any persisted token by fetching the profile. Call once on app load. */
  initialize: () => Promise<void>;
  login: (credentials: Credentials) => Promise<void>;
  register: (credentials: RegisterCredentials) => Promise<void>;
  /** Update the current user's profile and refresh the store. */
  updateProfile: (payload: { name?: string }) => Promise<void>;
  logout: () => void;
}

/** Global auth state. Zustand replaces the previous React Context provider. */
export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isAuthenticated: false,
  isInitializing: true,

  initialize: async () => {
    if (!getToken()) {
      set({ isInitializing: false });
      return;
    }
    try {
      const user = await authService.me();
      set({ user, isAuthenticated: true });
    } catch {
      clearToken();
    } finally {
      set({ isInitializing: false });
    }
  },

  login: async (credentials) => {
    const { accessToken, user } = await authService.login(credentials);
    setToken(accessToken);
    set({ user, isAuthenticated: true });
  },

  register: async (credentials) => {
    const { accessToken, user } = await authService.register(credentials);
    setToken(accessToken);
    set({ user, isAuthenticated: true });
  },

  updateProfile: async (payload) => {
    const user = await authService.updateProfile(payload);
    set({ user });
  },

  logout: () => {
    clearToken();
    set({ user: null, isAuthenticated: false });
  },
}));
