import { mockRequest, mockApiError } from './mockClient';
import { MOCK_USER } from './mockData';
import type { AuthResponse, LoginRequest, RegisterRequest, User } from '../../types';
import { ACCESS_TOKEN_KEY, REFRESH_TOKEN_KEY } from '../../config/api';

const MOCK_TOKEN = 'mock_access_token_abc123';
const MOCK_REFRESH = 'mock_refresh_token_xyz789';

export const mockAuthService = {
  async login(req: LoginRequest): Promise<AuthResponse> {
    return mockRequest(() => {
      if (req.password.length < 6) {
        throw mockApiError(401, 'Invalid credentials');
      }
      sessionStorage.setItem(ACCESS_TOKEN_KEY, MOCK_TOKEN);
      sessionStorage.setItem(REFRESH_TOKEN_KEY, MOCK_REFRESH);
      return {
        user: MOCK_USER,
        tokens: { access_token: MOCK_TOKEN, refresh_token: MOCK_REFRESH, token_type: 'bearer' },
      };
    });
  },

  async register(req: RegisterRequest): Promise<AuthResponse> {
    return mockRequest(() => {
      const newUser: User = { ...MOCK_USER, email: req.email, full_name: req.full_name, phone: req.phone };
      sessionStorage.setItem(ACCESS_TOKEN_KEY, MOCK_TOKEN);
      sessionStorage.setItem(REFRESH_TOKEN_KEY, MOCK_REFRESH);
      return {
        user: newUser,
        tokens: { access_token: MOCK_TOKEN, refresh_token: MOCK_REFRESH, token_type: 'bearer' },
      };
    });
  },

  async logout(): Promise<void> {
    return mockRequest(() => {
      sessionStorage.removeItem(ACCESS_TOKEN_KEY);
      sessionStorage.removeItem(REFRESH_TOKEN_KEY);
    });
  },

  async me(): Promise<User> {
    return mockRequest(() => {
      const token = sessionStorage.getItem(ACCESS_TOKEN_KEY);
      if (!token) throw mockApiError(401, 'Not authenticated');
      return MOCK_USER;
    });
  },
};
