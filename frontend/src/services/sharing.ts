import apiClient from './api';
import { ENDPOINTS } from '../config/api';
import type { CreateShareRequest, SharedAccess } from '../types';

export const sharingService = {
  async list(vaultId: string): Promise<SharedAccess[]> {
    const res = await apiClient.get<SharedAccess[]>(ENDPOINTS.SHARING, { params: { vault_id: vaultId } });
    return res.data;
  },
  async create(vaultId: string, req: CreateShareRequest): Promise<SharedAccess> {
    const res = await apiClient.post<SharedAccess>(ENDPOINTS.SHARING, req, { params: { vault_id: vaultId } });
    return res.data;
  },
  async revoke(id: string): Promise<void> {
    await apiClient.delete(ENDPOINTS.SHARE_BY_ID(id));
  },
  /** Vaults shared with the current user (e.g. as a doctor) — not yet wired
   * into any page, but exposed for a future "shared with me" view. */
  async listSharedWithMe(): Promise<SharedAccess[]> {
    const res = await apiClient.get<SharedAccess[]>(ENDPOINTS.SHARING_SHARED_WITH_ME);
    return res.data;
  },
};
