import { mockRequest } from './mockClient';
import { MOCK_USER } from './mockData';
import type { PasswordChangeRequest, User, UserUpdateRequest } from '../../types';

let currentUser: User = { ...MOCK_USER };

export const mockUserService = {
  async updateMe(req: UserUpdateRequest): Promise<User> {
    return mockRequest(() => {
      currentUser = { ...currentUser, ...req };
      return currentUser;
    });
  },

  async changePassword(_req: PasswordChangeRequest): Promise<void> {
    return mockRequest(() => undefined);
  },
};
