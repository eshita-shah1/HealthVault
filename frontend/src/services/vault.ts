import apiClient from './api';
import { ENDPOINTS } from '../config/api';
import type { Vault, VaultDashboard } from '../types';

export const vaultService = {
  async list(): Promise<Vault[]> {
    const res = await apiClient.get<Vault[]>(ENDPOINTS.VAULT);
    return res.data;
  },

  async getDashboard(vaultId: string): Promise<VaultDashboard> {
    const res = await apiClient.get<VaultDashboard>(ENDPOINTS.VAULT_DASHBOARD(vaultId));
    return res.data;
  },
};
