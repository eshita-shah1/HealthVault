import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  ArrowLeft,
  FileText,
  Calendar,
  Building2,
  UserCheck,
  Sparkles,
  Download,
  Trash2,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Pill,
  TestTube,
  ShieldAlert,
  XCircle,
  IndianRupee
} from 'lucide-react';
import { documentService, expenseService } from '../services';
import { getErrorMessage } from '../services/api';
import { useVault } from '../context/VaultContext';
import type { Diagnosis, DocumentDetail, LabReport, MedicalExpense, MedicalReport, Prescription, ProcessingLog } from '../types';
import { DocumentType, ProcessingStatus } from '../types';

export default function DocumentDetails() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { vaultId } = useVault();

  const [document, setDocument] = useState<DocumentDetail | null>(null);
  const [labReport, setLabReport] = useState<LabReport | null>(null);
  const [prescription, setPrescription] = useState<Prescription | null>(null);
  const [diagnosis, setDiagnosis] = useState<Diagnosis | null>(null);
  const [medicalReport, setMedicalReport] = useState<MedicalReport | null>(null);
  const [expense, setExpense] = useState<MedicalExpense | null>(null);
  const [logs, setLogs] = useState<ProcessingLog[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [downloading, setDownloading] = useState(false);

  const fetchDetails = useCallback(async () => {
    if (!id || !vaultId) return;
    try {
      setLoading(true);
      setError(null);
      const doc = await documentService.getById(id);
      setDocument(doc);

      switch (doc.document_type) {
        case DocumentType.LAB_REPORT:
          setLabReport(await documentService.getLabReport(vaultId, id));
          break;
        case DocumentType.PRESCRIPTION:
          setPrescription(await documentService.getPrescription(vaultId, id));
          break;
        case DocumentType.DIAGNOSIS:
          setDiagnosis(await documentService.getDiagnosis(vaultId, id));
          break;
        case DocumentType.MEDICAL_BILL:
        case DocumentType.PHARMACY_BILL: {
          const expenses = await expenseService.list(vaultId, id);
          setExpense(expenses[0] ?? null);
          break;
        }
        case DocumentType.MEDICAL_REPORT:
        case DocumentType.DISCHARGE_SUMMARY:
        case DocumentType.SCAN_REPORT:
        case DocumentType.CONSULTATION:
        case DocumentType.INSURANCE_DOCUMENT:
          setMedicalReport(await documentService.getMedicalReport(vaultId, id));
          break;
        default:
          break;
      }

      if (doc.processing_status === ProcessingStatus.NEEDS_REVIEW || doc.processing_status === ProcessingStatus.FAILED) {
        setLogs(await documentService.getLogs(id));
      }
    } catch (err) {
      setError(getErrorMessage(err, 'Document not found'));
    } finally {
      setLoading(false);
    }
  }, [id, vaultId]);

  useEffect(() => { fetchDetails(); }, [fetchDetails]);

  const handleDelete = async () => {
    if (!id || !window.confirm('Are you sure you want to delete this document?')) return;
    try {
      await documentService.delete(id);
      navigate('/documents');
    } catch (err) {
      alert(getErrorMessage(err, 'Failed to delete document'));
    }
  };

  const handleDownload = async () => {
    if (!id) return;
    setDownloading(true);
    try {
      const { blob, filename } = await documentService.download(id);
      const url = window.URL.createObjectURL(blob);
      const link = window.document.createElement('a');
      link.href = url;
      link.download = filename;
      link.click();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      alert(getErrorMessage(err, 'Unable to download document'));
    } finally {
      setDownloading(false);
    }
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>
        <div className="skeleton" style={{ height: 32, width: 200 }} />
        <div className="skeleton" style={{ height: 240 }} />
      </div>
    );
  }

  if (error || !document) {
    return (
      <div className="card empty-state">
        <AlertTriangle className="text-warning" size={48} />
        <h2 className="empty-state-title">Document Not Found</h2>
        <p className="empty-state-desc">{error || 'The requested document could not be retrieved.'}</p>
        <Link to="/documents" className="btn btn-primary">
          <ArrowLeft size={16} /> Back to Documents
        </Link>
      </div>
    );
  }

  const steps = [
    { label: 'Uploaded', status: ProcessingStatus.UPLOADED },
    { label: 'Processing', status: ProcessingStatus.PROCESSING },
    { label: 'OCR Done', status: ProcessingStatus.OCR_COMPLETED },
    { label: 'Classified', status: ProcessingStatus.CLASSIFIED },
    { label: 'Extracted', status: ProcessingStatus.EXTRACTED },
    { label: 'Validated', status: ProcessingStatus.VALIDATED },
    { label: 'Processed', status: ProcessingStatus.PROCESSED },
  ];

  const isFailed = document.processing_status === ProcessingStatus.FAILED;
  const needsReview = document.processing_status === ProcessingStatus.NEEDS_REVIEW;
  const currentStepIdx = steps.findIndex(s => s.status === document.processing_status);
  const activeIdx = currentStepIdx === -1 ? steps.length - 1 : currentStepIdx;

  const doctorName = labReport?.doctor_name ?? prescription?.doctor_name ?? diagnosis?.doctor_name ?? medicalReport?.doctor_name ?? null;
  const facilityName = labReport?.laboratory_name ?? medicalReport?.hospital_name ?? expense?.hospital_name ?? null;
  const confidencePct = document.classification_confidence != null ? Math.round(document.classification_confidence * 100) : null;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>
      {/* Top Header */}
      <div className="page-header" style={{ marginBottom: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
          <button
            onClick={() => navigate(-1)}
            className="btn btn-secondary btn-icon"
          >
            <ArrowLeft size={18} />
          </button>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
              <span className="badge badge-neutral">
                {(document.document_type ?? 'UNCLASSIFIED').replace(/_/g, ' ')}
              </span>
              {confidencePct != null && (
                <span className="summary-ai-badge">
                  <Sparkles size={10} /> {confidencePct}% AI Confidence
                </span>
              )}
            </div>
            <h1 className="page-title" style={{ marginTop: 4 }}>
              {document.original_filename}
            </h1>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
          <button onClick={handleDownload} className="btn btn-secondary" disabled={downloading}>
            <Download size={16} /> {downloading ? 'Downloading…' : 'Download'}
          </button>
          <button onClick={handleDelete} className="btn btn-danger">
            <Trash2 size={16} /> Delete
          </button>
        </div>
      </div>

      {/* Needs Review / Failed banners */}
      {needsReview && (
        <div className="card" style={{ borderColor: 'var(--color-warning)', background: 'var(--color-warning-bg)', display: 'flex', alignItems: 'flex-start', gap: 12 }}>
          <ShieldAlert size={22} style={{ color: 'var(--color-warning)', flexShrink: 0, marginTop: 2 }} />
          <div>
            <p style={{ fontWeight: 700, margin: 0 }}>Information needs review</p>
            <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-secondary)', margin: '4px 0 0' }}>
              The AI pipeline flagged this extraction as low-confidence or incomplete{confidencePct != null ? ` (${confidencePct}% confidence)` : ''}.
              Treat the extracted data below as unverified until you confirm it against the original document.
            </p>
          </div>
        </div>
      )}
      {isFailed && (
        <div className="card" style={{ borderColor: 'var(--color-error)', background: 'var(--color-error-bg)', display: 'flex', alignItems: 'flex-start', gap: 12 }}>
          <XCircle size={22} style={{ color: 'var(--color-error)', flexShrink: 0, marginTop: 2 }} />
          <div>
            <p style={{ fontWeight: 700, margin: 0 }}>Document processing failed</p>
            <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-secondary)', margin: '4px 0 0' }}>
              {logs.find(l => l.status === 'FAILED')?.message || 'The AI pipeline could not finish processing this document.'}
            </p>
          </div>
        </div>
      )}

      {/* AI Processing Stepper */}
      {!isFailed && (
        <div className="card">
          <h3 style={{ fontSize: 'var(--font-size-xs)', fontWeight: 600, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 'var(--space-4)', display: 'flex', alignItems: 'center', gap: 6 }}>
            <Sparkles size={14} className="text-primary" /> AI Pipeline Processing Status
          </h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(100px, 1fr))', gap: 'var(--space-2)' }}>
            {steps.map((step, idx) => {
              const isCompleted = idx <= activeIdx;
              const isCurrent = idx === activeIdx;

              return (
                <div
                  key={step.status}
                  style={{
                    padding: 'var(--space-3)',
                    borderRadius: 'var(--radius-md)',
                    border: isCurrent ? '1px solid var(--color-primary)' : '1px solid var(--color-border)',
                    background: isCurrent ? 'var(--color-primary-light)' : isCompleted ? 'var(--color-surface-alt)' : 'transparent',
                    textAlign: 'center',
                    opacity: isCompleted ? 1 : 0.5
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 4 }}>
                    {isCompleted ? (
                      <CheckCircle2 size={16} style={{ color: 'var(--color-primary)' }} />
                    ) : (
                      <Clock size={16} style={{ color: 'var(--color-text-muted)' }} />
                    )}
                  </div>
                  <p style={{ fontSize: 'var(--font-size-xs)', fontWeight: 600, color: 'var(--color-text)' }}>
                    {step.label}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Two-Column Layout: Left Preview, Right Info */}
      <div className="charts-grid" style={{ gridTemplateColumns: '1fr 1fr', marginTop: 0 }}>

        {/* Left: Document Preview */}
        <div className="card">
          <h3 style={{ fontSize: 'var(--font-size-md)', fontWeight: 700, marginBottom: 'var(--space-4)' }}>
            Original Document
          </h3>
          <div style={{ height: 320, background: 'var(--color-bg)', border: '2px dashed var(--color-border)', borderRadius: 'var(--radius-md)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 'var(--space-2)', padding: 'var(--space-6)', textAlign: 'center' }}>
            <FileText size={48} className="text-muted" />
            <p style={{ fontWeight: 600, fontSize: 'var(--font-size-sm)', margin: 0 }}>
              {document.original_filename}
            </p>
            <p style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-muted)', margin: 0 }}>
              The original file stays in secure storage — use Download above to retrieve it.
            </p>
          </div>
        </div>

        {/* Right: Document Metadata */}
        <div className="card">
          <h3 style={{ fontSize: 'var(--font-size-md)', fontWeight: 700, marginBottom: 'var(--space-4)' }}>
            Document Information
          </h3>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
            <div className="profile-field">
              <span className="profile-field-label" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <Calendar size={14} className="text-primary" /> Document Date
              </span>
              <span className="profile-field-value">{document.document_date || 'N/A'}</span>
            </div>

            <div className="profile-field">
              <span className="profile-field-label" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <Building2 size={14} className="text-primary" /> Facility / Lab
              </span>
              <span className="profile-field-value">{facilityName || 'Unspecified'}</span>
            </div>

            <div className="profile-field">
              <span className="profile-field-label" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <UserCheck size={14} className="text-primary" /> Doctor
              </span>
              <span className="profile-field-value">{doctorName || 'Unspecified'}</span>
            </div>

            <div className="profile-field">
              <span className="profile-field-label" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <FileText size={14} className="text-primary" /> File Size
              </span>
              <span className="profile-field-value">
                {(document.file_size_bytes / 1024).toFixed(1)} KB ({document.mime_type})
              </span>
            </div>
          </div>
        </div>

      </div>

      {/* Extracted Information Section — rendered per actual document type */}
      {labReport && labReport.results.length > 0 && (
        <div className="card">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 'var(--space-4)' }}>
            <h3 style={{ fontSize: 'var(--font-size-md)', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8 }}>
              <TestTube className="text-primary" size={18} /> Extracted Lab Results
            </h3>
            {labReport.laboratory_name && (
              <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-muted)' }}>{labReport.laboratory_name}</span>
            )}
          </div>

          <table className="lab-table">
            <thead>
              <tr>
                <th>Test Name</th>
                <th>Result Value</th>
                <th>Reference Range</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {labReport.results.map((res) => (
                <tr key={res.id}>
                  <td style={{ fontWeight: 600 }}>{res.test_name_normalized ?? res.test_name_raw}</td>
                  <td style={{ fontFamily: 'monospace', fontWeight: 600 }}>
                    {res.result_value_raw} <span style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>{res.unit_normalized ?? res.unit_raw}</span>
                  </td>
                  <td style={{ color: 'var(--color-text-secondary)', fontSize: 'var(--font-size-xs)' }}>{res.reference_range_raw || '-'}</td>
                  <td>
                    {res.flag === 'NORMAL' && <span className="badge badge-success">NORMAL</span>}
                    {res.flag === 'HIGH' && <span className="badge badge-warning">HIGH</span>}
                    {res.flag === 'LOW' && <span className="badge badge-info">LOW</span>}
                    {(res.flag === 'CRITICAL' || res.flag === 'ABNORMAL') && <span className="badge badge-error">{res.flag}</span>}
                    {res.flag === 'UNKNOWN' && <span className="badge badge-neutral">UNKNOWN</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {prescription && prescription.medicines.length > 0 && (
        <div className="card">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 'var(--space-4)' }}>
            <h3 style={{ fontSize: 'var(--font-size-md)', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8 }}>
              <Pill className="text-primary" size={18} /> Prescribed Medications
            </h3>
            {prescription.doctor_name && (
              <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-muted)' }}>Dr. {prescription.doctor_name}</span>
            )}
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
            {prescription.medicines.map((med) => (
              <div key={med.id} style={{ padding: 'var(--space-3)', background: 'var(--color-surface-alt)', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border-light)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <h4 style={{ fontWeight: 700, fontSize: 'var(--font-size-sm)' }}>{med.medicine_name_normalized ?? med.medicine_name_raw}</h4>
                  {med.dosage_raw && <span className="badge badge-success">{med.dosage_raw}</span>}
                </div>
                <div style={{ display: 'flex', gap: 'var(--space-4)', fontSize: 'var(--font-size-xs)', color: 'var(--color-text-secondary)', marginTop: 4 }}>
                  <span>Frequency: <strong>{med.frequency_normalized || '—'}</strong></span>
                  <span>Duration: <strong>{med.duration_raw || '—'}</strong></span>
                </div>
                {med.instructions && (
                  <p style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-muted)', marginTop: 6 }}>{med.instructions}</p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {diagnosis && (
        <div className="card">
          <h3 style={{ fontSize: 'var(--font-size-md)', fontWeight: 700, marginBottom: 'var(--space-4)', display: 'flex', alignItems: 'center', gap: 8 }}>
            <FileText className="text-primary" size={18} /> Diagnosis
          </h3>
          <p style={{ fontWeight: 700, fontSize: 'var(--font-size-sm)' }}>{diagnosis.condition_normalized ?? diagnosis.condition_raw}</p>
          {diagnosis.notes && <p style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-secondary)', marginTop: 4 }}>{diagnosis.notes}</p>}
        </div>
      )}

      {medicalReport && medicalReport.summary_text && (
        <div className="card">
          <h3 style={{ fontSize: 'var(--font-size-md)', fontWeight: 700, marginBottom: 'var(--space-4)', display: 'flex', alignItems: 'center', gap: 8 }}>
            <FileText className="text-primary" size={18} /> Report Summary
          </h3>
          <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-secondary)', lineHeight: 1.6 }}>{medicalReport.summary_text}</p>
        </div>
      )}

      {expense && (
        <div className="card">
          <h3 style={{ fontSize: 'var(--font-size-md)', fontWeight: 700, marginBottom: 'var(--space-4)', display: 'flex', alignItems: 'center', gap: 8 }}>
            <IndianRupee className="text-primary" size={18} /> Billed Amount
          </h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 'var(--space-4)' }}>
            <div className="profile-field" style={{ flexDirection: 'column', alignItems: 'flex-start', gap: 4 }}>
              <span className="profile-field-label">Total Amount</span>
              <span className="profile-field-value" style={{ fontWeight: 700 }}>{expense.currency} {expense.amount.toLocaleString('en-IN')}</span>
            </div>
            <div className="profile-field" style={{ flexDirection: 'column', alignItems: 'flex-start', gap: 4 }}>
              <span className="profile-field-label">Insurance Covered</span>
              <span className="profile-field-value">{expense.currency} {expense.insurance_covered.toLocaleString('en-IN')}</span>
            </div>
            <div className="profile-field" style={{ flexDirection: 'column', alignItems: 'flex-start', gap: 4 }}>
              <span className="profile-field-label">You Paid</span>
              <span className="profile-field-value" style={{ fontWeight: 700, color: 'var(--color-primary)' }}>{expense.currency} {expense.patient_paid.toLocaleString('en-IN')}</span>
            </div>
          </div>
        </div>
      )}

      {/* Processing log — shown when the pipeline flagged or failed this document */}
      {(needsReview || isFailed) && logs.length > 0 && (
        <div className="card">
          <h3 style={{ fontSize: 'var(--font-size-md)', fontWeight: 700, marginBottom: 'var(--space-4)' }}>Processing Log</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {logs.map((log) => (
              <div key={log.id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 'var(--font-size-xs)', padding: '6px 0', borderBottom: '1px solid var(--color-border-light)' }}>
                <span style={{ fontWeight: 600 }}>{log.stage}</span>
                <span style={{ color: log.status === 'FAILED' ? 'var(--color-error)' : 'var(--color-text-secondary)' }}>{log.status}{log.message ? ` — ${log.message}` : ''}</span>
              </div>
            ))}
          </div>
        </div>
      )}

    </div>
  );
}
