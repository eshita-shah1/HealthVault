import { mockRequest, mockApiError } from './mockClient';
import { MOCK_HEALTH_SUMMARY } from './mockData';
import type { GenerateSummaryRequest, HealthSummary } from '../../types';

export const mockSummaryService = {
  async getLatest(_vaultId: string): Promise<HealthSummary> {
    return mockRequest(() => MOCK_HEALTH_SUMMARY, { delay: 800 });
  },

  async generate(_vaultId: string, _req?: GenerateSummaryRequest): Promise<HealthSummary> {
    return mockRequest(
      () => ({ ...MOCK_HEALTH_SUMMARY, version: MOCK_HEALTH_SUMMARY.version + 1, created_at: new Date().toISOString() }),
      { delay: 2000 },
    );
  },

  async getById(id: string): Promise<HealthSummary> {
    return mockRequest(() => {
      if (id !== MOCK_HEALTH_SUMMARY.id) throw mockApiError(404, 'Summary not found');
      return MOCK_HEALTH_SUMMARY;
    });
  },
};
