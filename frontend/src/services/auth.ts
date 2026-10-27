import apiClient from './api';
import { ENDPOINTS, ACCESS_TOKEN_KEY, REFRESH_TOKEN_KEY } from '../config/api';
import type { AuthResponse, LoginRequest, RegisterRequest, User } from '../types';

/** Backend's actual /auth/register and /auth/login response shape: tokens
 * are flat top-level fields alongside `user`, not nested under `tokens`. */
interface BackendTokenResponse {
  access_token: string;
  refresh_token: string;
  token_type: 'bearer';
  user: User;
}

function toAuthResponse(data: BackendTokenResponse): AuthResponse {
  return {
    user: data.user,
    tokens: { access_token: data.access_token, refresh_token: data.refresh_token, token_type: data.token_type },
  };
}

export const authService = {
  async login(req: LoginRequest): Promise<AuthResponse> {
    const res = await apiClient.post<BackendTokenResponse>(ENDPOINTS.AUTH_LOGIN, req);
    const result = toAuthResponse(res.data);
    sessionStorage.setItem(ACCESS_TOKEN_KEY, result.tokens.access_token);
    sessionStorage.setItem(REFRESH_TOKEN_KEY, result.tokens.refresh_token);
    return result;
  },

  async register(req: RegisterRequest): Promise<AuthResponse> {
    const res = await apiClient.post<BackendTokenResponse>(ENDPOINTS.AUTH_REGISTER, req);
    const result = toAuthResponse(res.data);
    sessionStorage.setItem(ACCESS_TOKEN_KEY, result.tokens.access_token);
    sessionStorage.setItem(REFRESH_TOKEN_KEY, result.tokens.refresh_token);
    return result;
  },

  async logout(): Promise<void> {
    try { await apiClient.post(ENDPOINTS.AUTH_LOGOUT); } finally {
      sessionStorage.removeItem(ACCESS_TOKEN_KEY);
      sessionStorage.removeItem(REFRESH_TOKEN_KEY);
    }
  },

  /** There is no GET /auth/me on the backend — current-user lives at
   * GET /users/me. */
  async me(): Promise<User> {
    const res = await apiClient.get<User>(ENDPOINTS.USER_PROFILE);
    return res.data;
  },
};
