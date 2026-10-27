import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { MoreVertical, Eye, Trash2, FileText, FlaskConical, Pill, Receipt, FileHeart, Scan, FileCheck, Shield, Stethoscope } from 'lucide-react';
import { Badge } from '../ui/index';
import type { Document } from '../../types';
import { DocumentType, ProcessingStatus } from '../../types';

export const TYPE_CONFIG: Record<DocumentType, { label: string; icon: React.FC<{size?:number; className?:string}>; bg: string; color: string }> = {
  [DocumentType.LAB_REPORT]:         { label: 'Lab Report',         icon: FlaskConical,  bg: 'var(--color-lab-bg)',          color: 'var(--color-lab)' },
  [DocumentType.PRESCRIPTION]:       { label: 'Prescription',       icon: Pill,          bg: 'var(--color-prescription-bg)', color: 'var(--color-prescription)' },
  [DocumentType.MEDICAL_BILL]:       { label: 'Medical Bill',       icon: Receipt,       bg: 'var(--color-bill-bg)',         color: 'var(--color-bill)' },
  [DocumentType.PHARMACY_BILL]:      { label: 'Pharmacy Bill',      icon: Receipt,       bg: 'var(--color-bill-bg)',         color: 'var(--color-bill)' },
  [DocumentType.SCAN_REPORT]:        { label: 'Scan Report',        icon: Scan,          bg: 'var(--color-scan-bg)',         color: 'var(--color-scan)' },
  [DocumentType.MEDICAL_REPORT]:     { label: 'Medical Report',     icon: FileHeart,     bg: 'var(--color-success-bg)',     color: 'var(--color-success)' },
  [DocumentType.CONSULTATION]:       { label: 'Consultation',       icon: Stethoscope,   bg: 'var(--color-consult-bg)',     color: 'var(--color-consult)' },
  [DocumentType.DISCHARGE_SUMMARY]:  { label: 'Discharge Summary',  icon: FileCheck,     bg: 'var(--color-discharge-bg)',   color: 'var(--color-discharge)' },
  [DocumentType.INSURANCE_DOCUMENT]: { label: 'Insurance',          icon: Shield,        bg: 'var(--color-insurance-bg)',   color: 'var(--color-insurance)' },
  [DocumentType.DIAGNOSIS]:          { label: 'Diagnosis',          icon: FileText,      bg: 'var(--color-primary-light)',  color: 'var(--color-primary)' },
  [DocumentType.OTHER]:              { label: 'Other',              icon: FileText,      bg: 'var(--color-other-bg)',       color: 'var(--color-other)' },
};

export const STATUS_BADGE: Record<ProcessingStatus, { label: string; variant: 'success'|'warning'|'error'|'info'|'neutral' }> = {
  [ProcessingStatus.PROCESSED]:    { label: 'Processed',    variant: 'success' },
  [ProcessingStatus.PROCESSING]:   { label: 'Processing…', variant: 'info' },
  [ProcessingStatus.UPLOADED]:     { label: 'Uploaded',    variant: 'neutral' },
  [ProcessingStatus.OCR_COMPLETED]:{ label: 'OCR done',    variant: 'info' },
  [ProcessingStatus.CLASSIFIED]:   { label: 'Classified',  variant: 'info' },
  [ProcessingStatus.EXTRACTED]:    { label: 'Extracted',   variant: 'info' },
  [ProcessingStatus.VALIDATED]:    { label: 'Validated',   variant: 'info' },
  [ProcessingStatus.NEEDS_REVIEW]: { label: 'Needs Review',variant: 'warning' },
  [ProcessingStatus.FAILED]:       { label: 'Failed',      variant: 'error' },
};

export function formatDate(str?: string | null) {
  if (!str) return '';
  return new Date(str).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

interface DocumentCardProps {
  document: Document;
  onDelete: (id: string) => void;
}

export function DocumentCard({ document: item, onDelete }: DocumentCardProps) {
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const cfg = TYPE_CONFIG[item.document_type ?? DocumentType.OTHER] ?? TYPE_CONFIG[DocumentType.OTHER];
  const status = STATUS_BADGE[item.processing_status] || STATUS_BADGE[ProcessingStatus.PROCESSED];
  const Icon = cfg.icon;

  useEffect(() => {
    const h = (e: MouseEvent) => { if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false); };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);

  return (
    <article className="doc-card" onClick={() => navigate(`/documents/${item.id}`)}>
      <div className="doc-card-preview" style={{ background: cfg.bg, color: cfg.color }}>
        <Icon size={40} />
      </div>
      <div className="doc-card-body">
        <p className="doc-card-name truncate">{item.original_filename.replace(/\.[^.]+$/, '')}</p>
        <p className="doc-card-date">{formatDate(item.document_date ?? item.created_at)}</p>
        <p style={{ fontSize: 'var(--font-size-xs)', color: cfg.color, fontWeight: 500, marginTop: 4 }}>{cfg.label}</p>
      </div>
      <div className="doc-card-footer" onClick={(e) => e.stopPropagation()}>
        <Badge variant={status.variant} dot>{status.label}</Badge>
        <div className="dropdown" ref={menuRef}>
          <button
            className="doc-card-menu"
            onClick={(e) => { e.stopPropagation(); setMenuOpen(v => !v); }}
            aria-label="Document options"
            aria-expanded={menuOpen}
          >
            <MoreVertical size={16} />
          </button>
          {menuOpen && (
            <div className="dropdown-menu" role="menu">
              <button className="dropdown-item" onClick={() => navigate(`/documents/${item.id}`)}><Eye size={14} /> View</button>
              <button className="dropdown-item danger" onClick={() => { onDelete(item.id); setMenuOpen(false); }}><Trash2 size={14} /> Delete</button>
            </div>
          )}
        </div>
      </div>
    </article>
  );
}
