import apiClient from './api';
import { ENDPOINTS } from '../config/api';
import type { TimelineEvent, TimelineFilters } from '../types';

export const timelineService = {
  async list(vaultId: string, filters?: TimelineFilters): Promise<TimelineEvent[]> {
    const res = await apiClient.get<TimelineEvent[]>(ENDPOINTS.TIMELINE, {
      params: { vault_id: vaultId, ...filters },
    });
    return res.data;
  },
  async getById(id: string): Promise<TimelineEvent> {
    const res = await apiClient.get<TimelineEvent>(ENDPOINTS.TIMELINE_BY_ID(id));
    return res.data;
  },
};
