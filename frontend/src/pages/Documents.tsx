import { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  FileText,
  Search,
  Upload,
  Grid,
  List as ListIcon,
  X,
  AlertCircle
} from 'lucide-react';
import { documentService } from '../services';
import { getErrorMessage } from '../services/api';
import { useVault } from '../context/VaultContext';
import { DocumentType } from '../types';
import type { Document, DocumentFilters } from '../types';
import { DocumentCard } from '../components/documents/DocumentCard';
import { UploadModal } from '../components/documents/UploadModal';
import { ErrorState } from '../components/ui/index';

export default function Documents() {
  const { vaultId, refreshDashboard } = useVault();
  const [searchParams, setSearchParams] = useSearchParams();

  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [isUploadOpen, setIsUploadOpen] = useState<boolean>(false);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  // Filters — initialized from the URL so Header's global search (which
  // navigates to /documents?search=...) actually takes effect here.
  const [search, setSearch] = useState<string>(searchParams.get('search') ?? '');
  const [selectedType, setSelectedType] = useState<string>('');
  const [dateFrom, setDateFrom] = useState<string>('');
  const [dateTo, setDateTo] = useState<string>('');

  const fetchDocuments = useCallback(async () => {
    if (!vaultId) return;
    try {
      setLoading(true);
      setError(null);
      const filters: DocumentFilters = {};
      if (search.trim()) filters.search = search;
      if (selectedType) filters.document_type = selectedType as DocumentType;
      if (dateFrom) filters.date_from = dateFrom;
      if (dateTo) filters.date_to = dateTo;

      const res = await documentService.list(vaultId, filters);
      setDocuments(res.documents);
    } catch (err) {
      setError(getErrorMessage(err, 'Unable to load your documents.'));
    } finally {
      setLoading(false);
    }
  }, [vaultId, search, selectedType, dateFrom, dateTo]);

  useEffect(() => { fetchDocuments(); }, [fetchDocuments]);

  // Keep the URL in sync with the search box so the Header's search stays shareable.
  useEffect(() => {
    const next = new URLSearchParams(searchParams);
    if (search) next.set('search', search); else next.delete('search');
    setSearchParams(next, { replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);

  const handleDelete = async (id: string) => {
    await documentService.delete(id);
    fetchDocuments();
    refreshDashboard();
  };

  const clearFilters = () => {
    setSearch('');
    setSelectedType('');
    setDateFrom('');
    setDateTo('');
  };

  const hasFilters = Boolean(search || selectedType || dateFrom || dateTo);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>
      {/* Header section */}
      <div className="page-header" style={{ marginBottom: 0 }}>
        <div>
          <h1 className="page-title" style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
            <FileText className="text-primary" size={28} />
            Documents Vault
          </h1>
          <p className="page-subtitle">
            Search, filter, and view all your stored medical documents and extracted metadata.
          </p>
        </div>

        <button
          onClick={() => setIsUploadOpen(true)}
          className="btn btn-primary"
        >
          <Upload size={16} />
          Upload File
        </button>
      </div>

      {/* Filter and Search Toolbar */}
      <div className="card" style={{ padding: 'var(--space-4)', display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
        <div className="filters-bar" style={{ marginBottom: 0 }}>

          {/* Search input */}
          <div className="search-input-wrap">
            <Search className="search-icon-inner" size={16} />
            <input
              type="text"
              placeholder="Search documents by content, doctor, lab..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="input"
            />
          </div>

          {/* Type filter */}
          <select
            value={selectedType}
            onChange={(e) => setSelectedType(e.target.value)}
            className="input"
            style={{ width: 220 }}
          >
            <option value="">All Document Types</option>
            <option value={DocumentType.PRESCRIPTION}>Prescriptions</option>
            <option value={DocumentType.LAB_REPORT}>Lab Reports</option>
            <option value={DocumentType.MEDICAL_REPORT}>Medical Reports</option>
            <option value={DocumentType.DIAGNOSIS}>Diagnoses</option>
            <option value={DocumentType.DISCHARGE_SUMMARY}>Discharge Summaries</option>
            <option value={DocumentType.SCAN_REPORT}>Scan Reports</option>
            <option value={DocumentType.CONSULTATION}>Consultations</option>
            <option value={DocumentType.MEDICAL_BILL}>Medical Bills</option>
            <option value={DocumentType.PHARMACY_BILL}>Pharmacy Bills</option>
            <option value={DocumentType.INSURANCE_DOCUMENT}>Insurance Docs</option>
            <option value={DocumentType.OTHER}>Other</option>
          </select>

          {/* Date range inputs */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="input"
              style={{ width: 140, padding: '7px 10px', fontSize: 12 }}
              title="From Date"
            />
            <span style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>to</span>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="input"
              style={{ width: 140, padding: '7px 10px', fontSize: 12 }}
              title="To Date"
            />
          </div>

          {/* View Mode Toggle */}
          <div className="tabs" style={{ marginLeft: 'auto' }}>
            <button
              onClick={() => setViewMode('grid')}
              className={`tab-btn${viewMode === 'grid' ? ' active' : ''}`}
              title="Grid View"
            >
              <Grid size={16} />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`tab-btn${viewMode === 'list' ? ' active' : ''}`}
              title="List View"
            >
              <ListIcon size={16} />
            </button>
          </div>

        </div>

        {/* Filter tags if active */}
        {hasFilters && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', paddingTop: 'var(--space-2)', borderTop: '1px solid var(--color-border-light)', fontSize: 'var(--font-size-xs)' }}>
            <span style={{ color: 'var(--color-text-secondary)', fontWeight: 500 }}>
              Active filters:
            </span>
            {search && <span className="badge badge-info">Search: {search}</span>}
            {selectedType && <span className="badge badge-info">Type: {selectedType}</span>}
            {dateFrom && <span className="badge badge-info">From: {dateFrom}</span>}
            {dateTo && <span className="badge badge-info">To: {dateTo}</span>}

            <button
              onClick={clearFilters}
              className="btn btn-ghost btn-sm"
              style={{ marginLeft: 'auto', color: 'var(--color-error)' }}
            >
              <X size={12} /> Clear all
            </button>
          </div>
        )}
      </div>

      {/* Content Display */}
      {error ? (
        <ErrorState message={error} onRetry={fetchDocuments} />
      ) : loading ? (
        <div className="doc-grid">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="skeleton" style={{ height: 180 }} />
          ))}
        </div>
      ) : documents.length === 0 ? (
        <div className="card empty-state">
          <AlertCircle className="text-muted" size={40} />
          <h3 className="empty-state-title">No documents found</h3>
          <p className="empty-state-desc">
            {hasFilters
              ? 'No medical documents matched your current search or filter criteria. Try resetting the filters.'
              : 'Your vault is currently empty. Upload your first prescription, lab report, or bill.'}
          </p>
          {hasFilters ? (
            <button onClick={clearFilters} className="btn btn-secondary">
              Reset Filters
            </button>
          ) : (
            <button onClick={() => setIsUploadOpen(true)} className="btn btn-primary">
              Upload Document
            </button>
          )}
        </div>
      ) : (
        <div className={viewMode === 'grid' ? 'doc-grid' : 'flex-col gap-3'}>
          {documents.map((doc) => (
            <DocumentCard key={doc.id} document={doc} onDelete={handleDelete} />
          ))}
        </div>
      )}

      {/* Upload Modal */}
      {isUploadOpen && (
        <UploadModal
          onClose={() => setIsUploadOpen(false)}
          onUploadSuccess={() => {
            setIsUploadOpen(false);
            fetchDocuments();
            refreshDashboard();
          }}
        />
      )}
    </div>
  );
}
