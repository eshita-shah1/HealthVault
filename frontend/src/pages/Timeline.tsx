import { Clock } from 'lucide-react';
import { useTimeline } from '../hooks/index';
import { TimelineEventCard } from '../components/timeline/TimelineEventCard';
import { EmptyState, ErrorState, SkeletonCard } from '../components/ui/index';
import { TimelineEventType } from '../types';
import { useState } from 'react';

const EVENT_TYPE_LABELS: Record<string, string> = {
  '': 'All Categories',
  [TimelineEventType.LAB_TEST]:         'Lab Tests',
  [TimelineEventType.PRESCRIPTION]:     'Prescriptions',
  [TimelineEventType.CONSULTATION]:     'Consultations',
  [TimelineEventType.SCAN]:             'Scans',
  [TimelineEventType.HOSPITALIZATION]:  'Hospitalizations',
  [TimelineEventType.DISCHARGE]:        'Discharges',
  [TimelineEventType.DIAGNOSIS]:        'Diagnoses',
  [TimelineEventType.MEDICAL_EXPENSE]:  'Medical Expenses',
};

export default function Timeline() {
  const [eventType, setEventType] = useState<TimelineEventType | ''>('');
  const [dateRange, setDateRange] = useState<'all' | '3m' | '6m' | '1y'>('all');

  const { state, setFilters } = useTimeline();

  const updateFilters = (et: typeof eventType, dr: typeof dateRange) => {
    const df = dr === 'all' ? undefined : new Date(Date.now() - (dr==='3m'?90:dr==='6m'?180:365)*24*60*60*1000).toISOString().slice(0,10);
    setFilters({ event_type: et || undefined, date_from: df });
  };

  const events = state.status === 'success' ? state.data : [];

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Health Timeline</h1>
          <p className="page-subtitle">Your complete health journey in chronological order</p>
        </div>
        <div style={{ display: 'flex', gap: 12 }}>
          <select
            className="input"
            style={{ width: 180 }}
            value={eventType}
            onChange={e => { const v = e.target.value as typeof eventType; setEventType(v); updateFilters(v, dateRange); }}
            aria-label="Filter by category"
          >
            {Object.entries(EVENT_TYPE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
          <select
            className="input"
            style={{ width: 140 }}
            value={dateRange}
            onChange={e => { const v = e.target.value as typeof dateRange; setDateRange(v); updateFilters(eventType, v); }}
            aria-label="Filter by time"
          >
            <option value="all">All Time</option>
            <option value="3m">Last 3 Months</option>
            <option value="6m">Last 6 Months</option>
            <option value="1y">Last Year</option>
          </select>
        </div>
      </div>

      {state.status === 'loading' && <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>{[1,2,3,4].map(i => <SkeletonCard key={i} />)}</div>}
      {state.status === 'error' && <ErrorState message={state.error} />}
      {state.status === 'success' && events.length === 0 && (
        <EmptyState
          icon={Clock}
          title="Your health timeline will appear here"
          description="Upload and process your first medical document to start building your timeline."
        />
      )}
      {state.status === 'success' && events.length > 0 && (
        <div style={{ maxWidth: 760 }}>
          <div className="timeline">
            {events.map(ev => <TimelineEventCard key={ev.id} event={ev} showViewBtn />)}
          </div>
        </div>
      )}
    </div>
  );
}
