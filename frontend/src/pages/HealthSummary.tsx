import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  Sparkles,
  RefreshCw,
  ShieldCheck,
  FileText,
  Pill,
  Stethoscope,
  CheckCircle,
  Activity,
  ExternalLink
} from 'lucide-react';
import { summaryService } from '../services';
import { getErrorMessage } from '../services/api';
import { useVault } from '../context/VaultContext';
import type { HealthSummary } from '../types';
import { EmptyState, ErrorState } from '../components/ui/index';

/** View model this page renders, derived from the backend's real
 * HealthSummaryOut (summary_text + structured_data) — the backend does not
 * return pre-split "sections"; we build them here from the structured facts
 * so every number on this page traces back to a source document. */
interface SummaryViewModel {
  generatedAt: string;
  overview: string;
  keyDiagnoses: { label: string; sourceDocumentId: string }[];
  currentMedications: { name: string; dosage: string | null; frequency: string | null; sourceDocumentId: string }[];
  recentInvestigations: { test: string; result: string; date: string; sourceDocumentId: string }[];
  recentConsultations: { date: string; doctor: string; sourceDocumentId: string }[];
  sections: { title: string; content: string; source: 'AI_GENERATED' | 'EXTRACTED' }[];
}

function toViewModel(summary: HealthSummary): SummaryViewModel {
  const data = summary.structured_data;
  if (!data) {
    return {
      generatedAt: summary.created_at, overview: summary.summary_text,
      keyDiagnoses: [], currentMedications: [], recentInvestigations: [], recentConsultations: [], sections: [],
    };
  }

  const eventLines = data.recent_medical_events.map(e => `${e.date} — ${e.type.replace(/_/g, ' ')}: ${e.title}`);

  return {
    generatedAt: summary.created_at,
    overview: summary.summary_text,
    keyDiagnoses: data.known_conditions.map(c => ({
      label: c.condition.replace(/_/g, ' '), sourceDocumentId: c.source_document_id,
    })),
    currentMedications: data.current_medications.map(m => ({
      name: m.medicine, dosage: m.dosage, frequency: m.frequency, sourceDocumentId: m.source_document_id,
    })),
    recentInvestigations: data.recent_investigations.map(r => ({
      test: r.test_name.replace(/_/g, ' '),
      result: `${r.result ?? '—'}${r.unit ? ` ${r.unit}` : ''} (${r.flag})`,
      date: r.date ?? '',
      sourceDocumentId: r.source_document_id,
    })),
    recentConsultations: data.recent_consultations.map(c => ({
      date: c.date ?? '', doctor: c.doctor ?? 'Unknown doctor', sourceDocumentId: c.source_document_id,
    })),
    sections: [
      {
        title: 'Recent Medical Events',
        content: eventLines.length > 0 ? eventLines.join('\n') : 'No recent timeline events on record.',
        source: 'EXTRACTED',
      },
      {
        title: 'Document Coverage',
        content: `This summary was generated from ${data.available_documents} document(s) in the vault, with ₹${data.recent_expenses_total.toLocaleString('en-IN')} in expenses recorded over the last year.`,
        source: 'EXTRACTED',
      },
    ],
  };
}

function SourceLink({ documentId }: { documentId: string }) {
  return (
    <Link to={`/documents/${documentId}`} className="btn btn-ghost btn-sm" style={{ fontSize: 11, padding: '2px 6px', color: 'var(--color-primary)' }}>
      <ExternalLink size={11} /> Source
    </Link>
  );
}

export default function HealthSummaryPage() {
  const { vaultId } = useVault();
  const [summary, setSummary] = useState<HealthSummary | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [generating, setGenerating] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [notGenerated, setNotGenerated] = useState<boolean>(false);

  const fetchSummary = useCallback(async () => {
    if (!vaultId) return;
    try {
      setLoading(true);
      setError(null);
      setNotGenerated(false);
      const res = await summaryService.getLatest(vaultId);
      setSummary(res);
    } catch (err) {
      if ((err as { response?: { status?: number } })?.response?.status === 404) {
        setNotGenerated(true);
      } else {
        setError(getErrorMessage(err, 'Failed to load health summary.'));
      }
    } finally {
      setLoading(false);
    }
  }, [vaultId]);

  const handleRegenerate = async () => {
    if (!vaultId) return;
    try {
      setGenerating(true);
      setError(null);
      const res = await summaryService.generate(vaultId);
      setSummary(res);
      setNotGenerated(false);
    } catch (err) {
      setError(getErrorMessage(err, 'Failed to generate summary.'));
    } finally {
      setGenerating(false);
    }
  };

  useEffect(() => { fetchSummary(); }, [fetchSummary]);

  if (loading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>
        <div className="skeleton" style={{ height: 40, width: 240 }} />
        <div className="skeleton" style={{ height: 180 }} />
        <div className="skeleton" style={{ height: 260 }} />
      </div>
    );
  }

  const view = summary ? toViewModel(summary) : null;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-8)' }}>
      {/* Page Header */}
      <div className="page-header" style={{ marginBottom: 0 }}>
        <div>
          <div className="badge badge-info" style={{ marginBottom: 6 }}>
            <Sparkles size={12} /> AI-Synthesized Clinical Overview
          </div>
          <h1 className="page-title">Personal Health Summary</h1>
          <p className="page-subtitle">
            Generated from the structured data already extracted from your uploaded documents.
          </p>
        </div>

        <div style={{ display: 'flex', gap: 'var(--space-3)', flexWrap: 'wrap' }}>
          <button
            onClick={handleRegenerate}
            disabled={generating}
            className="btn btn-primary"
          >
            <RefreshCw size={14} className={generating ? 'spinner-sm' : ''} />
            {generating ? 'Analyzing Vault...' : summary ? 'Re-Generate AI Summary' : 'Generate Health Summary'}
          </button>
        </div>
      </div>

      {error && <ErrorState message={error} onRetry={fetchSummary} />}

      {!error && notGenerated && (
        <EmptyState
          icon={Sparkles}
          title="No health summary yet"
          description="Generate a summary to get an AI-synthesized overview of your conditions, medications and recent investigations, built from your uploaded documents."
          action={<button className="btn btn-primary" onClick={handleRegenerate} disabled={generating}>{generating ? 'Analyzing Vault...' : 'Generate Health Summary'}</button>}
        />
      )}

      {view && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>

          {/* Overview Banner Card */}
          <div className="card" style={{ background: 'linear-gradient(135deg, #064E3B 0%, #087443 100%)', color: 'white' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 'var(--font-size-xs)', color: 'var(--color-primary-mint)', marginBottom: 8 }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <ShieldCheck size={14} /> Generated From Your Structured Records
              </span>
              <span>Last generated: {new Date(view.generatedAt).toLocaleString()}</span>
            </div>

            <h2 style={{ fontSize: 'var(--font-size-lg)', fontWeight: 700, margin: '4px 0 10px', color: 'white' }}>
              Executive Health Status Overview
            </h2>
            <p style={{ fontSize: 'var(--font-size-sm)', lineHeight: 1.6, opacity: 0.95, margin: 0, whiteSpace: 'pre-line' }}>
              {view.overview}
            </p>

            {/* Key Diagnoses */}
            {view.keyDiagnoses.length > 0 && (
              <div style={{ marginTop: 'var(--space-4)', paddingTop: 'var(--space-4)', borderTop: '1px solid rgba(255,255,255,0.15)' }}>
                <span style={{ fontSize: 'var(--font-size-xs)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--color-primary-mint)', display: 'block', marginBottom: 8 }}>
                  Known Conditions
                </span>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  {view.keyDiagnoses.map((diag, i) => (
                    <span key={i} className="badge" style={{ background: 'rgba(255,255,255,0.15)', color: 'white', border: '1px solid rgba(255,255,255,0.2)' }}>
                      {diag.label}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Two-Column Grid: Active Conditions & Current Medications */}
          <div className="charts-grid" style={{ gridTemplateColumns: '1fr 1fr', marginTop: 0 }}>

            {/* Active Conditions */}
            <div className="card">
              <h3 style={{ fontSize: 'var(--font-size-md)', fontWeight: 700, marginBottom: 'var(--space-4)', display: 'flex', alignItems: 'center', gap: 8 }}>
                <Activity className="text-primary" size={18} /> Known Conditions
              </h3>
              {view.keyDiagnoses.length === 0 ? (
                <p className="empty-state-desc" style={{ margin: 0 }}>No diagnoses recorded in your vault yet.</p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
                  {view.keyDiagnoses.map((diag, idx) => (
                    <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: 'var(--space-3)', background: 'var(--color-surface-alt)', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border-light)' }}>
                      <p style={{ fontWeight: 600, fontSize: 'var(--font-size-sm)', margin: 0 }}>{diag.label}</p>
                      <SourceLink documentId={diag.sourceDocumentId} />
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Current Medications */}
            <div className="card">
              <h3 style={{ fontSize: 'var(--font-size-md)', fontWeight: 700, marginBottom: 'var(--space-4)', display: 'flex', alignItems: 'center', gap: 8 }}>
                <Pill className="text-primary" size={18} /> Current Medications
              </h3>
              {view.currentMedications.length === 0 ? (
                <p className="empty-state-desc" style={{ margin: 0 }}>No prescriptions recorded in your vault yet.</p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
                  {view.currentMedications.map((med, idx) => (
                    <div key={idx} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: 'var(--space-3)', background: 'var(--color-surface-alt)', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border-light)' }}>
                      <div>
                        <p style={{ fontWeight: 600, fontSize: 'var(--font-size-sm)' }}>{med.name}</p>
                        <p style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-secondary)' }}>Frequency: {med.frequency ?? '—'}</p>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        {med.dosage && <span className="badge badge-success">{med.dosage}</span>}
                        <SourceLink documentId={med.sourceDocumentId} />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

          </div>

          {/* Recent Key Investigations Table */}
          <div className="card">
            <h3 style={{ fontSize: 'var(--font-size-md)', fontWeight: 700, marginBottom: 'var(--space-4)', display: 'flex', alignItems: 'center', gap: 8 }}>
              <Stethoscope className="text-primary" size={18} /> Recent Key Investigations
            </h3>

            {view.recentInvestigations.length === 0 ? (
              <p className="empty-state-desc" style={{ margin: 0 }}>No lab results recorded in your vault yet.</p>
            ) : (
              <table className="lab-table">
                <thead>
                  <tr>
                    <th>Test</th>
                    <th>Date</th>
                    <th>Result</th>
                    <th>Status</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {view.recentInvestigations.map((inv, idx) => {
                    const isHigh = inv.result.toLowerCase().includes('high');
                    const isLow = inv.result.toLowerCase().includes('low');
                    const isNormal = inv.result.toLowerCase().includes('normal');

                    return (
                      <tr key={idx}>
                        <td style={{ fontWeight: 600 }}>{inv.test}</td>
                        <td style={{ color: 'var(--color-text-secondary)', fontSize: 'var(--font-size-xs)' }}>{inv.date || '—'}</td>
                        <td style={{ fontFamily: 'monospace', fontWeight: 600 }}>{inv.result}</td>
                        <td>
                          {isHigh && <span className="badge badge-warning">HIGH</span>}
                          {isLow && <span className="badge badge-info">LOW</span>}
                          {isNormal && <span className="badge badge-success">NORMAL</span>}
                          {!isHigh && !isLow && !isNormal && <span className="badge badge-neutral">CHECKED</span>}
                        </td>
                        <td><SourceLink documentId={inv.sourceDocumentId} /></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>

          {/* Recent Consultations */}
          {view.recentConsultations.length > 0 && (
            <div className="card">
              <h3 style={{ fontSize: 'var(--font-size-md)', fontWeight: 700, marginBottom: 'var(--space-4)', display: 'flex', alignItems: 'center', gap: 8 }}>
                <Stethoscope className="text-primary" size={18} /> Recent Consultations
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
                {view.recentConsultations.map((c, idx) => (
                  <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: idx < view.recentConsultations.length - 1 ? '1px solid var(--color-border-light)' : 'none' }}>
                    <span style={{ fontSize: 'var(--font-size-sm)' }}>{c.date || '—'} — {c.doctor}</span>
                    <SourceLink documentId={c.sourceDocumentId} />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Detailed Clinical Insights with Small Badges */}
          <div className="card">
            <h3 style={{ fontSize: 'var(--font-size-md)', fontWeight: 700, marginBottom: 'var(--space-4)', display: 'flex', alignItems: 'center', gap: 8 }}>
              <FileText className="text-primary" size={18} /> Detailed Clinical Insights
            </h3>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 'var(--space-4)' }}>
              {view.sections.map((sec, idx) => (
                <div key={idx} style={{ padding: 'var(--space-4)', background: 'var(--color-surface-alt)', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                    <h4 style={{ fontSize: 'var(--font-size-sm)', fontWeight: 700 }}>{sec.title}</h4>
                    {sec.source === 'EXTRACTED' ? (
                      <span className="summary-extracted-badge">
                        <CheckCircle size={10} /> Extracted
                      </span>
                    ) : (
                      <span className="summary-ai-badge">
                        <Sparkles size={10} /> AI Generated
                      </span>
                    )}
                  </div>
                  <p style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-secondary)', lineHeight: 1.5, whiteSpace: 'pre-line' }}>
                    {sec.content}
                  </p>
                </div>
              ))}
            </div>
          </div>

        </div>
      )}
    </div>
  );
}
