import { useNavigate } from 'react-router-dom';
import { FlaskConical, Pill, Stethoscope, Hospital, LogOut, Activity, IndianRupee, Scan } from 'lucide-react';
import type { TimelineEvent } from '../../types';
import { TimelineEventType } from '../../types';

const EVENT_ICON: Record<TimelineEventType, React.FC<{size?:number; className?:string}>> = {
  [TimelineEventType.LAB_TEST]:         FlaskConical,
  [TimelineEventType.PRESCRIPTION]:     Pill,
  [TimelineEventType.CONSULTATION]:     Stethoscope,
  [TimelineEventType.SCAN]:             Scan,
  [TimelineEventType.HOSPITALIZATION]:  Hospital,
  [TimelineEventType.DISCHARGE]:        LogOut,
  [TimelineEventType.DIAGNOSIS]:        Activity,
  [TimelineEventType.MEDICAL_EXPENSE]:  IndianRupee,
};

const EVENT_COLOR: Record<TimelineEventType, string> = {
  [TimelineEventType.LAB_TEST]:         'var(--color-lab)',
  [TimelineEventType.PRESCRIPTION]:     'var(--color-prescription)',
  [TimelineEventType.CONSULTATION]:     'var(--color-consult)',
  [TimelineEventType.SCAN]:             'var(--color-scan)',
  [TimelineEventType.HOSPITALIZATION]:  'var(--color-discharge)',
  [TimelineEventType.DISCHARGE]:        'var(--color-discharge)',
  [TimelineEventType.DIAGNOSIS]:        'var(--color-primary)',
  [TimelineEventType.MEDICAL_EXPENSE]:  'var(--color-bill)',
};

function formatDate(str: string) {
  return new Date(str).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

interface Props { event: TimelineEvent; showViewBtn?: boolean; }

export function TimelineEventCard({ event, showViewBtn = false }: Props) {
  const navigate = useNavigate();
  const Icon = EVENT_ICON[event.event_type] || Activity;
  const color = EVENT_COLOR[event.event_type] || 'var(--color-primary)';

  return (
    <div className="timeline-item">
      <div className="timeline-spine">
        <div style={{ width: 36, height: 36, borderRadius: '50%', background: `${color}18`, display: 'flex', alignItems: 'center', justifyContent: 'center', border: `2px solid ${color}`, flexShrink: 0, color }}>
          <Icon size={16} />
        </div>
        <div className="timeline-line" />
      </div>
      <div className="timeline-content">
        <span className="timeline-date-badge">{formatDate(event.event_date)}</span>
        <div
          className="timeline-card"
          onClick={() => event.document_id && navigate(`/documents/${event.document_id}`)}
          style={{ cursor: event.document_id ? 'pointer' : 'default' }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ fontWeight: 600, fontSize: 'var(--font-size-sm)', marginBottom: 2 }}>{event.title}</p>
              {event.description && <p style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-muted)', marginTop: 4 }}>{event.description}</p>}
            </div>
            {showViewBtn && event.document_id && (
              <button
                className="btn btn-secondary btn-sm"
                style={{ flexShrink: 0, fontSize: 11 }}
                onClick={(e) => { e.stopPropagation(); navigate(`/documents/${event.document_id}`); }}
              >
                View Details
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
