export interface User {
  id: string;
  email: string;
  name: string | null;
  createdAt: string;
}

export interface AuthResponse {
  accessToken: string;
  user: User;
}

export interface Credentials {
  email: string;
  password: string;
}

export interface RegisterCredentials extends Credentials {
  name?: string;
}

export interface UsageSummary {
  spentUsd: number;
  budgetUsd: number;
  remainingUsd: number;
  resetInSeconds: number;
}
