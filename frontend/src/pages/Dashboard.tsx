import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  FileText,
  Upload,
  TrendingUp,
  Activity,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  AlertCircle,
  FileCheck,
  Plus
} from 'lucide-react';
import { documentService, expenseService, timelineService } from '../services';
import { getErrorMessage } from '../services/api';
import { useVault } from '../context/VaultContext';
import type { Document, ExpenseSummary, TimelineEvent } from '../types';
import { StatCard } from '../components/dashboard/StatCard';
import { DocumentCard } from '../components/documents/DocumentCard';
import { UploadModal } from '../components/documents/UploadModal';
import { TimelineEventCard } from '../components/timeline/TimelineEventCard';
import { ErrorState } from '../components/ui/index';

function formatBytes(bytes: number): string {
  const mb = bytes / (1024 * 1024);
  return mb < 1024 ? `${mb.toFixed(1)} MB` : `${(mb / 1024).toFixed(2)} GB`;
}

export default function Dashboard() {
  const { vaultId, dashboard, refreshDashboard } = useVault();
  const [documents, setDocuments] = useState<Document[]>([]);
  const [expenseSummary, setExpenseSummary] = useState<ExpenseSummary | null>(null);
  const [recentEvents, setRecentEvents] = useState<TimelineEvent[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [isUploadOpen, setIsUploadOpen] = useState<boolean>(false);

  const fetchData = useCallback(async () => {
    if (!vaultId) return;
    try {
      setLoading(true);
      setError(null);
      const [docsRes, summaryRes, timelineRes] = await Promise.all([
        documentService.list(vaultId, { limit: 6 }),
        expenseService.summary(vaultId),
        timelineService.list(vaultId),
      ]);
      setDocuments(docsRes.documents);
      setExpenseSummary(summaryRes);
      setRecentEvents(timelineRes.slice(0, 4));
    } catch (err) {
      setError(getErrorMessage(err, 'Unable to load your dashboard.'));
    } finally {
      setLoading(false);
    }
  }, [vaultId]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleDelete = async (id: string) => {
    await documentService.delete(id);
    fetchData();
    refreshDashboard();
  };

  if (error && !loading) {
    return <ErrorState message={error} onRetry={fetchData} />;
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-8)' }}>
      {/* Banner / Header greeting */}
      <div
        className="card"
        style={{
          background: 'linear-gradient(135deg, var(--color-primary-dark) 0%, var(--color-primary) 100%)',
          color: 'white',
          position: 'relative',
          overflow: 'hidden',
          padding: 'var(--space-8)'
        }}
      >
        <div style={{ position: 'relative', zIndex: 2, maxWidth: '640px', display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
          <div className="badge" style={{ background: 'rgba(255,255,255,0.15)', color: 'var(--color-primary-mint)', backdropFilter: 'blur(4px)', width: 'fit-content' }}>
            <ShieldCheck size={14} /> Owner-Controlled Secure Vault
          </div>
          <h1 style={{ fontSize: 'var(--font-size-2xl)', fontWeight: 700, margin: 0, color: 'white' }}>
            Welcome to your Health Vault
          </h1>
          <p style={{ fontSize: 'var(--font-size-sm)', opacity: 0.9, lineHeight: 1.5, margin: 0 }}>
            Your centralized, AI-powered medical record repository. All prescriptions, lab results, and medical expenses in one secure location.
          </p>
          <div style={{ display: 'flex', gap: 'var(--space-3)', marginTop: 'var(--space-3)', flexWrap: 'wrap' }}>
            <button
              onClick={() => setIsUploadOpen(true)}
              className="btn btn-white"
              style={{ fontWeight: 600 }}
            >
              <Upload size={16} /> Upload Document
            </button>
            <Link
              to="/health-summary"
              className="btn btn-outline-white"
              style={{ fontWeight: 600 }}
            >
              <Sparkles size={16} /> View AI Summary
            </Link>
          </div>
        </div>
      </div>

      {/* 4 Statistic Cards Grid */}
      <div className="stat-cards-grid">
        <StatCard
          title="Total Documents"
          value={dashboard ? dashboard.document_count.toString() : '—'}
          subtitle="All files cataloged"
          icon={FileText}
          iconBg="var(--color-primary-light)"
          iconColor="var(--color-primary)"
        />
        <StatCard
          title="Vault Storage"
          value={dashboard ? formatBytes(dashboard.storage_used_bytes) : '—'}
          subtitle="Secure cloud backup"
          icon={Activity}
          iconBg="var(--color-success-bg)"
          iconColor="var(--color-success)"
        />
        <StatCard
          title="Total Healthcare Spend"
          value={expenseSummary ? `₹${expenseSummary.total.toLocaleString('en-IN')}` : '₹0'}
          subtitle="Out of pocket & covered"
          icon={TrendingUp}
          iconBg="var(--color-bill-bg)"
          iconColor="var(--color-bill)"
        />
        <StatCard
          title="AI Extraction Status"
          value={dashboard && dashboard.documents_needing_review > 0 ? `${dashboard.documents_needing_review} Need Review` : 'All Clear'}
          subtitle={dashboard && dashboard.documents_needing_review > 0 ? 'Review flagged extractions' : 'Zero pending reviews'}
          icon={FileCheck}
          iconBg="var(--color-info-bg)"
          iconColor="var(--color-info)"
        />
      </div>

      {/* Main Content Grid: Recent Docs & Timeline */}
      <div className="charts-grid" style={{ gridTemplateColumns: '2fr 1fr', marginTop: 0 }}>

        {/* Left Column: Recent Documents */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
          <div className="page-header" style={{ marginBottom: 0 }}>
            <div>
              <h2 className="page-title" style={{ fontSize: 'var(--font-size-xl)', display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                <FileText className="text-primary" size={20} />
                Recent Documents
              </h2>
            </div>
            <Link
              to="/documents"
              className="btn btn-ghost btn-sm"
              style={{ color: 'var(--color-primary)', fontWeight: 600 }}
            >
              View all <ArrowRight size={14} />
            </Link>
          </div>

          {loading ? (
            <div className="doc-grid">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="skeleton" style={{ height: 160 }} />
              ))}
            </div>
          ) : documents.length === 0 ? (
            <div className="card empty-state">
              <AlertCircle className="text-muted" size={36} />
              <p className="empty-state-desc">No documents uploaded yet.</p>
              <button
                onClick={() => setIsUploadOpen(true)}
                className="btn btn-primary btn-sm"
              >
                Upload First File
              </button>
            </div>
          ) : (
            <div className="doc-grid">
              {documents.slice(0, 4).map((doc) => (
                <DocumentCard key={doc.id} document={doc} onDelete={handleDelete} />
              ))}
            </div>
          )}

          {/* Quick Upload helper banner */}
          <div className="card" style={{ background: 'var(--color-primary-mint)', borderColor: 'rgba(8,116,67,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 'var(--space-4)', marginTop: 'var(--space-2)' }}>
            <div>
              <h3 style={{ fontSize: 'var(--font-size-md)', fontWeight: 700, color: 'var(--color-text)' }}>
                Have a new prescription or bill?
              </h3>
              <p style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-secondary)', marginTop: 2 }}>
                Drag & drop your file or scan with your camera for automatic AI data extraction.
              </p>
            </div>
            <button
              onClick={() => setIsUploadOpen(true)}
              className="btn btn-primary btn-sm"
            >
              <Plus size={14} /> Add New Document
            </button>
          </div>
        </div>

        {/* Right Column: Health Timeline Widget */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
          <div className="page-header" style={{ marginBottom: 0 }}>
            <div>
              <h2 className="page-title" style={{ fontSize: 'var(--font-size-xl)', display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                <Activity className="text-primary" size={20} />
                Medical Timeline
              </h2>
            </div>
            <Link
              to="/timeline"
              className="btn btn-ghost btn-sm"
              style={{ color: 'var(--color-primary)', fontWeight: 600 }}
            >
              Full Timeline <ArrowRight size={14} />
            </Link>
          </div>

          <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
            {recentEvents.length === 0 && !loading && (
              <p className="empty-state-desc" style={{ textAlign: 'center', margin: 0 }}>No timeline events yet.</p>
            )}
            {recentEvents.map((evt) => (
              <TimelineEventCard key={evt.id} event={evt} />
            ))}
          </div>
        </div>

      </div>

      {/* Upload Modal */}
      {isUploadOpen && (
        <UploadModal
          onClose={() => setIsUploadOpen(false)}
          onUploadSuccess={() => {
            setIsUploadOpen(false);
            fetchData();
            refreshDashboard();
          }}
        />
      )}
    </div>
  );
}
