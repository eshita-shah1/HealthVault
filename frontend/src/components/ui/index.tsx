import React from 'react';
import { AlertCircle, FolderOpen } from 'lucide-react';

// ─── Spinner ────────────────────────────────────────────────────
export function Spinner({ size = 'md' }: { size?: 'sm' | 'md' | 'lg' }) {
  return <div className={`spinner spinner-${size}`} role="status" aria-label="Loading" />;
}

// ─── Skeleton ───────────────────────────────────────────────────
export function Skeleton({ width, height, style }: { width?: string; height?: string; style?: React.CSSProperties }) {
  return <div className="skeleton" style={{ width: width ?? '100%', height: height ?? '16px', ...style }} />;
}

export function SkeletonCard() {
  return (
    <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <Skeleton height="20px" width="60%" />
      <Skeleton height="14px" width="40%" />
      <Skeleton height="40px" />
    </div>
  );
}

// ─── Badge ──────────────────────────────────────────────────────
type BadgeVariant = 'success' | 'warning' | 'error' | 'info' | 'neutral';
export function Badge({ children, variant = 'neutral', dot }: { children: React.ReactNode; variant?: BadgeVariant; dot?: boolean }) {
  return <span className={`badge badge-${variant}${dot ? ' badge-dot' : ''}`}>{children}</span>;
}

// ─── EmptyState ─────────────────────────────────────────────────
export function EmptyState({
  icon: Icon = FolderOpen,
  title,
  description,
  action,
}: {
  icon?: React.FC<{ size?: number }>;
  title: string;
  description?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="empty-state">
      <div className="empty-state-icon"><Icon size={28} /></div>
      <p className="empty-state-title">{title}</p>
      {description && <p className="empty-state-desc">{description}</p>}
      {action}
    </div>
  );
}

// ─── ErrorState ─────────────────────────────────────────────────
export function ErrorState({ message, onRetry }: { message?: string; onRetry?: () => void }) {
  return (
    <div className="empty-state">
      <div className="empty-state-icon" style={{ background: 'var(--color-error-bg)', color: 'var(--color-error)' }}>
        <AlertCircle size={28} />
      </div>
      <p className="empty-state-title">Something went wrong</p>
      <p className="empty-state-desc">{message ?? 'We couldn\'t load your data. Please try again.'}</p>
      {onRetry && <button className="btn btn-secondary" onClick={onRetry}>Retry</button>}
    </div>
  );
}

// ─── Modal ──────────────────────────────────────────────────────
export function Modal({
  title,
  onClose,
  children,
  footer,
  size = 'md',
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
  footer?: React.ReactNode;
  size?: 'md' | 'lg';
}) {
  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div className="modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }} role="dialog" aria-modal aria-labelledby="modal-title">
      <div className={`modal${size === 'lg' ? ' modal-lg' : ''}`}>
        <div className="modal-header">
          <h2 className="modal-title" id="modal-title">{title}</h2>
          <button className="btn btn-ghost btn-icon" onClick={onClose} aria-label="Close modal">
            ✕
          </button>
        </div>
        <div className="modal-body">{children}</div>
        {footer && <div className="modal-footer">{footer}</div>}
      </div>
    </div>
  );
}

// ─── Alert ──────────────────────────────────────────────────────
export function Alert({ type, children }: { type: 'error' | 'success' | 'warning'; children: React.ReactNode }) {
  return <div className={`alert alert-${type}`}><AlertCircle size={16} />{children}</div>;
}
