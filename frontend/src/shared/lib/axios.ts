import axios, { AxiosError, type InternalAxiosRequestConfig } from 'axios';
import { clearToken, getToken } from './token';

const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3000';

/** Shared Axios instance. Base URL always comes from env. */
export const api = axios.create({
  baseURL: `${API_URL}/api`,
  headers: { 'Content-Type': 'application/json' },
});

/** Attach the JWT to every request when one is present. */
api.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const token = getToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

/** Auth endpoints handle their own 401s inline (e.g. "invalid credentials"). */
function isAuthEndpoint(url: string | undefined): boolean {
  return Boolean(url && (url.includes('/auth/login') || url.includes('/auth/register')));
}

/**
 * On a 401 from an authenticated request, the session is dead: clear the token
 * and bounce to /login. Login/register failures are left for the form to show.
 */
api.interceptors.response.use(
  (res) => res,
  (error: AxiosError) => {
    if (error.response?.status === 401 && !isAuthEndpoint(error.config?.url)) {
      clearToken();
      if (window.location.pathname !== '/login') {
        window.location.assign('/login');
      }
    }
    return Promise.reject(error);
  },
);

/** Base API origin (no `/api` suffix) — used by the SSE chat stream. */
export const API_ORIGIN = API_URL;
