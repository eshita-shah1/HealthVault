import { useState, useCallback, useRef, useEffect } from 'react';
import { Upload, File as FileIcon, CheckCircle, X, AlertCircle, Loader } from 'lucide-react';
import { Modal, Badge } from '../ui/index';
import { documentService } from '../../services';
import { getErrorMessage } from '../../services/api';
import { useVault } from '../../context/VaultContext';
import { STATUS_BADGE } from './DocumentCard';
import { ProcessingStatus } from '../../types';

const ALLOWED_TYPES = ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png'];
const MAX_SIZE_BYTES = 50 * 1024 * 1024;
const TERMINAL_STATUSES: ProcessingStatus[] = [
  ProcessingStatus.PROCESSED, ProcessingStatus.NEEDS_REVIEW, ProcessingStatus.FAILED,
];
const POLL_INTERVAL_MS = 3000;

type ItemStatus = 'pending' | 'uploading' | 'processing' | 'done' | 'error';

interface UploadItem {
  key: string;
  file: File;
  status: ItemStatus;
  progress: number;
  documentId?: string;
  processingStatus?: ProcessingStatus;
  error?: string;
}

function makeKey(file: File): string {
  return `${file.name}-${file.size}-${file.lastModified}-${Math.random().toString(36).slice(2, 8)}`;
}

interface Props { onClose: () => void; onUploadSuccess?: () => void; }

export function UploadModal({ onClose, onUploadSuccess }: Props) {
  const { vaultId } = useVault();
  const [dragOver, setDragOver] = useState(false);
  const [items, setItems] = useState<UploadItem[]>([]);
  const [rejections, setRejections] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const hasStarted = items.some(i => i.status !== 'pending');
  const allSettled = items.length > 0 && items.every(i => i.status === 'done' || i.status === 'error');
  const doneCount = items.filter(i => i.status === 'done').length;
  const errorCount = items.filter(i => i.status === 'error').length;

  const addFiles = (fileList: FileList | File[]) => {
    const newRejections: string[] = [];
    const accepted: UploadItem[] = [];
    Array.from(fileList).forEach((file) => {
      if (!ALLOWED_TYPES.includes(file.type)) {
        newRejections.push(`${file.name} — unsupported file type`);
        return;
      }
      if (file.size > MAX_SIZE_BYTES) {
        newRejections.push(`${file.name} — exceeds 50 MB`);
        return;
      }
      accepted.push({ key: makeKey(file), file, status: 'pending', progress: 0 });
    });
    if (newRejections.length) setRejections(prev => [...prev, ...newRejections]);
    if (accepted.length) setItems(prev => [...prev, ...accepted]);
  };

  const removeItem = (key: string) => setItems(prev => prev.filter(i => i.key !== key));

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer.files.length) addFiles(e.dataTransfer.files);
  }, []);

  const updateItem = (key: string, patch: Partial<UploadItem>) => {
    setItems(prev => prev.map(i => (i.key === key ? { ...i, ...patch } : i)));
  };

  const startUpload = async () => {
    if (!vaultId) return;
    setSubmitting(true);
    const pending = items.filter(i => i.status === 'pending');
    await Promise.all(pending.map(async (item) => {
      updateItem(item.key, { status: 'uploading', progress: 0 });
      try {
        const doc = await documentService.upload(
          vaultId, { file: item.file }, (pct) => updateItem(item.key, { progress: pct }),
        );
        updateItem(item.key, { status: 'processing', documentId: doc.id, processingStatus: doc.processing_status });
      } catch (err) {
        updateItem(item.key, { status: 'error', error: getErrorMessage(err, 'Upload failed') });
      }
    }));
    setSubmitting(false);
  };

  // Single polling loop for every in-flight document, reading live item
  // state via a ref so the interval never closes over stale state.
  const itemsRef = useRef<UploadItem[]>(items);
  useEffect(() => { itemsRef.current = items; }, [items]);

  useEffect(() => {
    const interval = setInterval(async () => {
      const processing = itemsRef.current.filter(i => i.status === 'processing' && i.documentId);
      if (processing.length === 0) return;
      const results = await Promise.all(processing.map(async (item) => {
        try {
          const status = await documentService.pollProcessingStatus(item.documentId!);
          return { key: item.key, processingStatus: status, status: (TERMINAL_STATUSES.includes(status) ? 'done' : 'processing') as ItemStatus };
        } catch {
          return { key: item.key, status: 'error' as ItemStatus, error: 'Lost connection while processing' };
        }
      }));
      setItems(prev => prev.map(i => {
        const r = results.find(x => x.key === i.key);
        return r ? { ...i, ...r } : i;
      }));
    }, POLL_INTERVAL_MS);
    return () => clearInterval(interval);
  }, []);

  const handleFinish = () => {
    if (doneCount > 0) onUploadSuccess?.();
    onClose();
  };

  return (
    <Modal title={items.length > 1 ? `Upload ${items.length} Documents` : 'Upload Medical Document'} onClose={onClose} size={items.length > 0 ? 'lg' : 'md'}>
      {/* File picker — available until upload starts */}
      {!hasStarted && (
        <>
          <div
            className={`drop-zone${dragOver ? ' drag-over' : ''}`}
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
            onClick={() => fileRef.current?.click()}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => { if (e.key === 'Enter') fileRef.current?.click(); }}
            aria-label="Drop zone for file upload"
          >
            <Upload size={40} className="drop-zone-icon" />
            <p style={{ fontWeight: 600, marginBottom: 4 }}>Drop your files here</p>
            <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-secondary)' }}>or click to browse — you can select multiple files</p>
            <p style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-muted)', marginTop: 12 }}>PDF, JPG, JPEG, PNG • Max 50 MB each</p>
          </div>
          <input
            ref={fileRef}
            type="file"
            multiple
            accept=".pdf,.jpg,.jpeg,.png"
            className="sr-only"
            onChange={(e) => { if (e.target.files?.length) addFiles(e.target.files); e.target.value = ''; }}
            aria-label="File input"
          />
        </>
      )}

      {rejections.length > 0 && (
        <div className="alert alert-error" style={{ marginTop: 12, flexDirection: 'column', alignItems: 'flex-start', gap: 4 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}><AlertCircle size={16} /> Some files were skipped:</div>
          {rejections.map((r, i) => <span key={i} style={{ fontSize: 'var(--font-size-xs)' }}>{r}</span>)}
        </div>
      )}

      {/* Selected / in-progress file list */}
      {items.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 16, maxHeight: 320, overflowY: 'auto' }}>
          {items.map((item) => (
            <div key={item.key} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px', background: 'var(--color-surface-alt)', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)' }}>
              <FileIcon size={18} style={{ color: 'var(--color-primary)', flexShrink: 0 }} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ fontWeight: 500, fontSize: 'var(--font-size-sm)' }} className="truncate">{item.file.name}</p>

                {item.status === 'pending' && (
                  <p style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-muted)' }}>{(item.file.size / 1024 / 1024).toFixed(2)} MB</p>
                )}
                {item.status === 'uploading' && (
                  <div style={{ height: 4, background: 'var(--color-border)', borderRadius: 'var(--radius-full)', overflow: 'hidden', marginTop: 4, width: '100%' }}>
                    <div style={{ height: '100%', background: 'var(--color-primary)', width: `${item.progress}%`, transition: 'width 0.2s' }} />
                  </div>
                )}
                {item.status === 'error' && (
                  <p style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-error)' }}>{item.error}</p>
                )}
              </div>

              <div style={{ flexShrink: 0 }}>
                {item.status === 'pending' && (
                  <button className="btn btn-ghost btn-icon" onClick={(e) => { e.stopPropagation(); removeItem(item.key); }} aria-label={`Remove ${item.file.name}`}>
                    <X size={14} />
                  </button>
                )}
                {item.status === 'uploading' && <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-muted)' }}>{item.progress}%</span>}
                {item.status === 'processing' && (
                  <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 'var(--font-size-xs)', color: 'var(--color-text-secondary)' }}>
                    <Loader size={14} style={{ animation: 'spin 1s linear infinite' }} /> Processing…
                  </span>
                )}
                {item.status === 'done' && item.processingStatus && (
                  <Badge variant={STATUS_BADGE[item.processingStatus].variant} dot>{STATUS_BADGE[item.processingStatus].label}</Badge>
                )}
                {item.status === 'error' && <Badge variant="error" dot>Failed</Badge>}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Actions */}
      {!hasStarted && (
        <div style={{ display: 'flex', gap: 12, marginTop: 24 }}>
          <button className="btn btn-secondary" onClick={onClose} style={{ flex: 1 }}>Cancel</button>
          <button
            className="btn btn-primary"
            style={{ flex: 1 }}
            onClick={startUpload}
            disabled={items.length === 0 || submitting}
          >
            {submitting ? <><div className="spinner spinner-sm" /> Uploading…</> : `Upload ${items.length || ''} Document${items.length === 1 ? '' : 's'}`}
          </button>
        </div>
      )}

      {hasStarted && (
        <div style={{ marginTop: 20 }}>
          {!allSettled && (
            <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-secondary)', textAlign: 'center' }}>
              Analysing and extracting medical information…
            </p>
          )}
          {allSettled && (
            <div style={{ textAlign: 'center', marginBottom: 16 }}>
              <CheckCircle size={40} style={{ color: 'var(--color-primary)', margin: '0 auto 8px' }} />
              <p style={{ fontWeight: 700 }}>
                {doneCount} processed{errorCount > 0 ? `, ${errorCount} failed` : ''}
              </p>
            </div>
          )}
          <button className="btn btn-primary" style={{ width: '100%' }} onClick={handleFinish} disabled={!allSettled}>
            {allSettled ? 'Done' : 'Please wait…'}
          </button>
        </div>
      )}
    </Modal>
  );
}
