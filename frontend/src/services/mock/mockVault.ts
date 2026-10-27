import { mockRequest } from './mockClient';
import { MOCK_DOCUMENTS, MOCK_VAULT } from './mockData';
import type { Vault, VaultDashboard } from '../../types';

export const mockVaultService = {
  async list(): Promise<Vault[]> {
    return mockRequest(() => [MOCK_VAULT]);
  },

  async getDashboard(_vaultId: string): Promise<VaultDashboard> {
    return mockRequest(() => ({
      document_count: MOCK_DOCUMENTS.length,
      documents_needing_review: MOCK_DOCUMENTS.filter(d => d.processing_status === 'NEEDS_REVIEW').length,
      documents_by_type: {},
      timeline_event_count: 4,
      member_count: 1,
      storage_used_bytes: MOCK_DOCUMENTS.reduce((sum, d) => sum + d.file_size_bytes, 0),
      expense_total: 18450,
      expense_current_month: 2000,
      recent_documents: MOCK_DOCUMENTS.slice(0, 5).map(d => ({
        id: d.id, filename: d.original_filename, document_type: d.document_type,
        processing_status: d.processing_status, created_at: d.created_at,
      })),
      recent_timeline_events: [],
    }));
  },
};
