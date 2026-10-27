import { useState, useEffect, useCallback } from 'react';
import {
  Share2,
  ShieldCheck,
  Trash2,
  Clock,
  UserCheck,
  Lock,
  Plus
} from 'lucide-react';
import { sharingService } from '../services';
import { getErrorMessage } from '../services/api';
import { useVault } from '../context/VaultContext';
import type { SharedAccess, CreateShareRequest } from '../types';
import { DocumentType, VaultRole } from '../types';
import { TYPE_CONFIG } from '../components/documents/DocumentCard';
import { ErrorState } from '../components/ui/index';

const ROLE_LABELS: Record<string, string> = {
  [VaultRole.DOCTOR]: 'Doctor',
  [VaultRole.VIEWER]: 'Viewer',
  [VaultRole.FAMILY_MEMBER]: 'Family Member',
};

const STATUS_BADGE: Record<string, { label: string; variant: 'success' | 'error' | 'warning' }> = {
  ACTIVE: { label: 'Active', variant: 'success' },
  REVOKED: { label: 'Revoked', variant: 'error' },
  EXPIRED: { label: 'Expired', variant: 'warning' },
};

const ALL_DOCUMENT_TYPES = Object.values(DocumentType);

export default function Sharing() {
  const { vaultId } = useVault();
  const [shares, setShares] = useState<SharedAccess[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState<boolean>(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Form state
  const [recipientEmail, setRecipientEmail] = useState<string>('');
  const [role, setRole] = useState<VaultRole>(VaultRole.DOCTOR);
  const [expiresDays, setExpiresDays] = useState<number>(7);
  const [allowedTypes, setAllowedTypes] = useState<Set<DocumentType>>(
    new Set([DocumentType.LAB_REPORT, DocumentType.PRESCRIPTION, DocumentType.DIAGNOSIS]),
  );

  const fetchShares = useCallback(async () => {
    if (!vaultId) return;
    try {
      setLoading(true);
      setError(null);
      const list = await sharingService.list(vaultId);
      setShares(list);
    } catch (err) {
      setError(getErrorMessage(err, 'Failed to load shared access.'));
    } finally {
      setLoading(false);
    }
  }, [vaultId]);

  useEffect(() => { fetchShares(); }, [fetchShares]);

  const toggleType = (type: DocumentType) => {
    setAllowedTypes(prev => {
      const next = new Set(prev);
      if (next.has(type)) next.delete(type); else next.add(type);
      return next;
    });
  };

  const handleCreateShare = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!vaultId) return;
    setFormError(null);
    setSubmitting(true);
    try {
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + expiresDays);

      const req: CreateShareRequest = {
        shared_with_email: recipientEmail.trim(),
        role,
        allowed_document_types: Array.from(allowedTypes),
        expires_at: expiresAt.toISOString(),
      };

      await sharingService.create(vaultId, req);
      setIsCreating(false);
      setRecipientEmail('');
      fetchShares();
    } catch (err) {
      setFormError(getErrorMessage(err, 'Failed to grant access.'));
    } finally {
      setSubmitting(false);
    }
  };

  const handleRevoke = async (id: string) => {
    if (!window.confirm('Revoke this access grant immediately?')) return;
    try {
      await sharingService.revoke(id);
      fetchShares();
    } catch (err) {
      alert(getErrorMessage(err, 'Failed to revoke access'));
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>
      {/* Header */}
      <div className="page-header" style={{ marginBottom: 0 }}>
        <div>
          <h1 className="page-title" style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
            <Share2 className="text-primary" size={28} />
            Vault Sharing
          </h1>
          <p className="page-subtitle">
            Grant doctors, specialists or family members access to specific document categories — never your whole vault.
          </p>
        </div>

        <button
          onClick={() => setIsCreating(!isCreating)}
          className="btn btn-primary"
        >
          <Plus size={16} />
          {isCreating ? 'Cancel' : 'Grant Access'}
        </button>
      </div>

      {/* Create Share Form */}
      {isCreating && (
        <form onSubmit={handleCreateShare} className="card" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-5)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingBottom: 'var(--space-3)', borderBottom: '1px solid var(--color-border)' }}>
            <h3 style={{ fontSize: 'var(--font-size-md)', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8 }}>
              <Lock className="text-primary" size={18} /> Configure Access Grant
            </h3>
            <span className="badge badge-success">
              Owner-Controlled
            </span>
          </div>

          {formError && <div className="alert alert-error">{formError}</div>}

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 'var(--space-4)' }}>
            <div className="input-group">
              <label className="label" htmlFor="share-email">
                Recipient Email
              </label>
              <input
                id="share-email"
                type="email"
                required
                placeholder="doctor@example.com"
                value={recipientEmail}
                onChange={(e) => setRecipientEmail(e.target.value)}
                className="input"
              />
            </div>

            <div className="input-group">
              <label className="label">
                Recipient Role
              </label>
              <select
                value={role}
                onChange={(e) => setRole(e.target.value as VaultRole)}
                className="input"
              >
                <option value={VaultRole.DOCTOR}>Doctor</option>
                <option value={VaultRole.VIEWER}>Viewer</option>
                <option value={VaultRole.FAMILY_MEMBER}>Family Member</option>
              </select>
            </div>

            <div className="input-group">
              <label className="label">
                Access Expiration
              </label>
              <select
                value={expiresDays}
                onChange={(e) => setExpiresDays(Number(e.target.value))}
                className="input"
              >
                <option value={1}>1 Day (24 Hours)</option>
                <option value={7}>7 Days (1 Week)</option>
                <option value={30}>30 Days (1 Month)</option>
              </select>
            </div>
          </div>

          {/* Scope selection checkboxes */}
          <div className="input-group">
            <label className="label">
              Included Document Categories
            </label>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 'var(--space-2)', marginTop: 4 }}>
              {ALL_DOCUMENT_TYPES.map((type) => (
                <label key={type} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: 'var(--space-3)', background: 'var(--color-surface-alt)', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)', cursor: 'pointer', fontSize: 'var(--font-size-sm)' }}>
                  <input type="checkbox" checked={allowedTypes.has(type)} onChange={() => toggleType(type)} />
                  <span style={{ fontWeight: 500 }}>{TYPE_CONFIG[type].label}</span>
                </label>
              ))}
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', paddingTop: 'var(--space-2)' }}>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={submitting || !recipientEmail.trim() || allowedTypes.size === 0}
            >
              {submitting ? 'Granting Access…' : 'Grant Access'}
            </button>
          </div>
        </form>
      )}

      {/* Active Shares List */}
      <div className="card">
        <h2 style={{ fontSize: 'var(--font-size-md)', fontWeight: 700, marginBottom: 'var(--space-4)', display: 'flex', alignItems: 'center', gap: 8 }}>
          <UserCheck className="text-primary" size={18} />
          Shared Access
        </h2>

        {error ? (
          <ErrorState message={error} onRetry={fetchShares} />
        ) : loading ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
            {[1, 2].map((i) => (
              <div key={i} className="skeleton" style={{ height: 60 }} />
            ))}
          </div>
        ) : shares.length === 0 ? (
          <p className="empty-state-desc" style={{ padding: 'var(--space-6) 0', textAlign: 'center', margin: '0 auto' }}>
            No one has been granted access yet. Click "Grant Access" above to share specific record categories securely.
          </p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
            {shares.map((share) => {
              const statusInfo = STATUS_BADGE[share.status] ?? STATUS_BADGE.ACTIVE;
              return (
                <div key={share.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 'var(--space-3)', padding: 'var(--space-3)', background: 'var(--color-surface-alt)', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border-light)' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                      <span style={{ fontWeight: 700, fontSize: 'var(--font-size-sm)' }}>
                        {share.shared_with_email || 'Unknown recipient'}
                      </span>
                      <span className="badge badge-neutral">
                        {ROLE_LABELS[share.role] ?? share.role}
                      </span>
                      <span className={`badge badge-${statusInfo.variant}`}>
                        {statusInfo.label}
                      </span>
                    </div>

                    <div style={{ display: 'flex', gap: 'var(--space-4)', fontSize: 'var(--font-size-xs)', color: 'var(--color-text-muted)', flexWrap: 'wrap' }}>
                      {share.expires_at && (
                        <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                          <Clock size={12} /> Expires: {new Date(share.expires_at).toLocaleDateString()}
                        </span>
                      )}
                      <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                        <ShieldCheck size={12} /> Scope: {(share.allowed_document_types ?? []).map(t => TYPE_CONFIG[t]?.label ?? t).join(', ') || 'None'}
                      </span>
                    </div>
                  </div>

                  {share.status === 'ACTIVE' && (
                    <button
                      onClick={() => handleRevoke(share.id)}
                      className="btn btn-danger btn-icon"
                      title="Revoke Access"
                    >
                      <Trash2 size={14} />
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
