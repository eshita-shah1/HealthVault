import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import type { Vault, VaultDashboard } from '../types';
import { VaultService } from '../services';
import { getErrorMessage } from '../services/api';
import { useAuth } from './AuthContext';

/**
 * Every backend endpoint (documents, timeline, expenses, sharing, summaries)
 * is scoped to a vault_id — the backend has no concept of a single implicit
 * "current vault". This context resolves the signed-in user's own vault once
 * (a user always owns exactly one vault, created at registration) and shares
 * it + the vault dashboard stats with the whole authenticated app, instead of
 * every page re-fetching GET /vault itself.
 */
interface VaultContextValue {
  vault: Vault | null;
  vaultId: string | null;
  dashboard: VaultDashboard | null;
  isLoading: boolean;
  error: string | null;
  refreshDashboard: () => Promise<void>;
  refresh: () => Promise<void>;
}

const VaultContext = createContext<VaultContextValue | null>(null);

export function VaultProvider({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAuth();
  const [vault, setVault] = useState<Vault | null>(null);
  const [dashboard, setDashboard] = useState<VaultDashboard | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refreshDashboard = useCallback(async () => {
    const current = vault;
    if (!current) return;
    try {
      const data = await VaultService.getDashboard(current.id);
      setDashboard(data);
    } catch (err) {
      setError(getErrorMessage(err, 'Unable to load vault statistics.'));
    }
  }, [vault]);

  const refresh = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const vaults = await VaultService.list();
      const primary = vaults[0] ?? null;
      setVault(primary);
      if (primary) {
        const data = await VaultService.getDashboard(primary.id);
        setDashboard(data);
      } else {
        setDashboard(null);
      }
    } catch (err) {
      setError(getErrorMessage(err, 'Unable to load your Health Vault.'));
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isAuthenticated) {
      refresh();
    } else {
      setVault(null);
      setDashboard(null);
      setIsLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated]);

  return (
    <VaultContext.Provider
      value={{ vault, vaultId: vault?.id ?? null, dashboard, isLoading, error, refreshDashboard, refresh }}
    >
      {children}
    </VaultContext.Provider>
  );
}

export function useVault(): VaultContextValue {
  const ctx = useContext(VaultContext);
  if (!ctx) throw new Error('useVault must be used inside <VaultProvider>');
  return ctx;
}
