const TOKEN_KEY = 'finchat.accessToken';

/**
 * Single source of truth for the JWT. Kept in memory for synchronous access
 * by the axios interceptor and mirrored to localStorage so it survives reloads.
 */
let currentToken: string | null =
  typeof localStorage !== 'undefined' ? localStorage.getItem(TOKEN_KEY) : null;

export function getToken(): string | null {
  return currentToken;
}

export function setToken(token: string): void {
  currentToken = token;
  localStorage.setItem(TOKEN_KEY, token);
}

export function clearToken(): void {
  currentToken = null;
  localStorage.removeItem(TOKEN_KEY);
}
