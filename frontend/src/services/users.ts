import apiClient from './api';
import { ENDPOINTS } from '../config/api';
import type { PasswordChangeRequest, User, UserUpdateRequest } from '../types';

export const userService = {
  async updateMe(req: UserUpdateRequest): Promise<User> {
    const res = await apiClient.patch<User>(ENDPOINTS.USER_UPDATE, req);
    return res.data;
  },

  async changePassword(req: PasswordChangeRequest): Promise<void> {
    await apiClient.post(ENDPOINTS.USER_CHANGE_PASSWORD, req);
  },
};
