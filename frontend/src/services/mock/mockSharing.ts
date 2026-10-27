import { mockRequest } from './mockClient';
import { MOCK_SHARED_ACCESS } from './mockData';
import type { CreateShareRequest, SharedAccess } from '../../types';
import { ShareStatus } from '../../types';

let sharedAccessList = [...MOCK_SHARED_ACCESS];

export const mockSharingService = {
  async list(_vaultId: string): Promise<SharedAccess[]> {
    return mockRequest(() => [...sharedAccessList]);
  },

  async create(vaultId: string, req: CreateShareRequest): Promise<SharedAccess> {
    return mockRequest(() => {
      const entry: SharedAccess = {
        id: `share-${Date.now()}`,
        vault_id: vaultId,
        owner_id: 'user-001',
        shared_with_email: req.shared_with_email,
        role: req.role,
        allowed_document_types: req.allowed_document_types ?? null,
        status: ShareStatus.ACTIVE,
        expires_at: req.expires_at ?? null,
        created_at: new Date().toISOString(),
      };
      sharedAccessList = [entry, ...sharedAccessList];
      return entry;
    });
  },

  async revoke(id: string): Promise<void> {
    return mockRequest(() => {
      const idx = sharedAccessList.findIndex(s => s.id === id);
      if (idx !== -1) sharedAccessList[idx] = { ...sharedAccessList[idx], status: ShareStatus.REVOKED };
    });
  },

  async listSharedWithMe(): Promise<SharedAccess[]> {
    return mockRequest(() => []);
  },
};
