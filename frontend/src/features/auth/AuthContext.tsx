import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { clearToken, getToken, setToken } from '@/shared/lib/token';
import { authApi } from './api/auth.api';
import type { Credentials, User } from './types';

interface AuthContextValue {
  user: User | null;
  isAuthenticated: boolean;
  /** True during the initial token-validation check on app load. */
  isInitializing: boolean;
  login: (credentials: Credentials) => Promise<void>;
  register: (credentials: Credentials) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null);
  const [isInitializing, setIsInitializing] = useState(true);

  // On load, verify any persisted token by fetching the profile.
  useEffect(() => {
    if (!getToken()) {
      setIsInitializing(false);
      return;
    }
    authApi
      .me()
      .then(setUser)
      .catch(() => clearToken())
      .finally(() => setIsInitializing(false));
  }, []);

  const login = useCallback(async (credentials: Credentials) => {
    const { accessToken, user: loggedIn } = await authApi.login(credentials);
    setToken(accessToken);
    setUser(loggedIn);
  }, []);

  const register = useCallback(async (credentials: Credentials) => {
    const { accessToken, user: created } = await authApi.register(credentials);
    setToken(accessToken);
    setUser(created);
  }, []);

  const logout = useCallback(() => {
    clearToken();
    setUser(null);
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      isAuthenticated: user !== null,
      isInitializing,
      login,
      register,
      logout,
    }),
    [user, isInitializing, login, register, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return ctx;
}
