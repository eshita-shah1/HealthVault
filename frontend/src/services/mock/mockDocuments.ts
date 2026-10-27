import { mockRequest, mockUploadRequest, mockApiError } from './mockClient';
import { MOCK_DOCUMENTS, MOCK_LAB_REPORTS, MOCK_PRESCRIPTIONS, MOCK_DIAGNOSES } from './mockData';
import type {
  Diagnosis, Document, DocumentDetail, DocumentFilters, DocumentListResponse, DocumentUploadRequest,
  LabReport, MedicalReport, Prescription, ProcessingLog,
} from '../../types';
import { ProcessingStatus, DocumentType } from '../../types';

let documents = [...MOCK_DOCUMENTS];

export const mockDocumentService = {
  async list(_vaultId: string, filters?: DocumentFilters): Promise<DocumentListResponse> {
    return mockRequest(() => {
      let result = [...documents];
      if (filters?.document_type) result = result.filter(d => d.document_type === filters.document_type);
      if (filters?.search) {
        const q = filters.search.toLowerCase();
        result = result.filter(d => d.original_filename.toLowerCase().includes(q));
      }
      if (filters?.date_from) result = result.filter(d => d.document_date && d.document_date >= filters.date_from!);
      if (filters?.date_to) result = result.filter(d => d.document_date && d.document_date <= filters.date_to!);
      result.sort((a, b) => b.created_at.localeCompare(a.created_at));
      const limit = filters?.limit ?? 50;
      const offset = filters?.offset ?? 0;
      return { documents: result.slice(offset, offset + limit), total: result.length, limit, offset };
    });
  },

  async getById(id: string): Promise<DocumentDetail> {
    return mockRequest(() => {
      const doc = documents.find(d => d.id === id);
      if (!doc) throw mockApiError(404, 'Document not found');
      return { ...doc, extracted_text: null, doc_metadata: null };
    });
  },

  async getLogs(_id: string): Promise<ProcessingLog[]> {
    return mockRequest(() => []);
  },

  async upload(vaultId: string, req: DocumentUploadRequest, onProgress?: (pct: number) => void): Promise<Document> {
    return mockUploadRequest(() => {
      const ext = req.file.name.split('.').pop()?.toLowerCase();
      const mime = ext === 'pdf' ? 'application/pdf' : `image/${ext}`;
      const newDoc: Document = {
        id: `doc-${Date.now()}`,
        vault_id: vaultId,
        original_filename: req.file.name,
        file_size_bytes: req.file.size,
        mime_type: mime,
        document_type: null,
        processing_status: ProcessingStatus.UPLOADED,
        is_archived: false,
        created_at: new Date().toISOString(),
      };
      documents = [newDoc, ...documents];
      return newDoc;
    }, onProgress);
  },

  async delete(id: string): Promise<void> {
    return mockRequest(() => {
      const idx = documents.findIndex(d => d.id === id);
      if (idx === -1) throw mockApiError(404, 'Document not found');
      documents.splice(idx, 1);
    });
  },

  async download(id: string): Promise<{ blob: Blob; filename: string }> {
    return mockRequest(() => {
      const doc = documents.find(d => d.id === id);
      if (!doc) throw mockApiError(404, 'Document not found');
      return { blob: new Blob(['Mock document content'], { type: doc.mime_type }), filename: doc.original_filename };
    });
  },

  async getLabReport(_vaultId: string, documentId: string): Promise<LabReport | null> {
    return mockRequest(() => MOCK_LAB_REPORTS[documentId] ?? null);
  },

  async getPrescription(_vaultId: string, documentId: string): Promise<Prescription | null> {
    return mockRequest(() => MOCK_PRESCRIPTIONS[documentId] ?? null);
  },

  async getDiagnosis(_vaultId: string, documentId: string): Promise<Diagnosis | null> {
    return mockRequest(() => MOCK_DIAGNOSES.find(d => d.document_id === documentId) ?? null);
  },

  async getMedicalReport(_vaultId: string, _documentId: string): Promise<MedicalReport | null> {
    return mockRequest(() => null);
  },

  // Simulates the AI processing pipeline with progressive status updates
  async pollProcessingStatus(documentId: string): Promise<ProcessingStatus> {
    const statuses: ProcessingStatus[] = [
      ProcessingStatus.UPLOADED,
      ProcessingStatus.PROCESSING,
      ProcessingStatus.OCR_COMPLETED,
      ProcessingStatus.CLASSIFIED,
      ProcessingStatus.EXTRACTED,
      ProcessingStatus.VALIDATED,
      ProcessingStatus.PROCESSED,
    ];
    const doc = documents.find(d => d.id === documentId);
    if (!doc) throw mockApiError(404, 'Document not found');
    const currentIdx = statuses.indexOf(doc.processing_status);
    const nextIdx = Math.min(currentIdx + 1, statuses.length - 1);
    doc.processing_status = statuses[nextIdx];
    if (nextIdx === statuses.length - 1) {
      doc.document_type = DocumentType.LAB_REPORT;
      doc.classification_confidence = 0.94;
    }
    return doc.processing_status;
  },
};
