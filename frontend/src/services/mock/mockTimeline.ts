import { mockRequest } from './mockClient';
import { MOCK_TIMELINE } from './mockData';
import type { TimelineEvent, TimelineFilters } from '../../types';

export const mockTimelineService = {
  async list(_vaultId: string, filters?: TimelineFilters): Promise<TimelineEvent[]> {
    return mockRequest(() => {
      let result = [...MOCK_TIMELINE];
      if (filters?.event_type) result = result.filter(e => e.event_type === filters.event_type);
      if (filters?.date_from) result = result.filter(e => e.event_date >= filters.date_from!);
      if (filters?.date_to) result = result.filter(e => e.event_date <= filters.date_to!);
      return result.sort((a, b) => b.event_date.localeCompare(a.event_date));
    });
  },

  async getById(id: string): Promise<TimelineEvent> {
    return mockRequest(() => {
      const event = MOCK_TIMELINE.find(e => e.id === id);
      if (!event) throw { status: 404, message: 'Event not found' };
      return event;
    });
  },
};
