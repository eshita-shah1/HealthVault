import apiClient from './api';
import { ENDPOINTS } from '../config/api';
import type { GenerateSummaryRequest, HealthSummary } from '../types';

export const summaryService = {
  async getLatest(vaultId: string): Promise<HealthSummary> {
    const res = await apiClient.get<HealthSummary>(ENDPOINTS.SUMMARIES_LATEST, { params: { vault_id: vaultId } });
    return res.data;
  },
  async generate(vaultId: string, req?: GenerateSummaryRequest): Promise<HealthSummary> {
    const res = await apiClient.post<HealthSummary>(ENDPOINTS.SUMMARIES_GENERATE, req ?? {}, {
      params: { vault_id: vaultId },
    });
    return res.data;
  },
  async getById(id: string): Promise<HealthSummary> {
    const res = await apiClient.get<HealthSummary>(ENDPOINTS.SUMMARY_BY_ID(id));
    return res.data;
  },
};
