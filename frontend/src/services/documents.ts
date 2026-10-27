import apiClient from './api';
import { ENDPOINTS } from '../config/api';
import type {
  Diagnosis, Document, DocumentDetail, DocumentFilters, DocumentListResponse, DocumentUploadRequest,
  LabReport, MedicalReport, Page, Prescription, ProcessingLog, ProcessingStatus,
} from '../types';

export const documentService = {
  /** Lists/searches documents in a vault. Uses GET /search (not GET
   * /documents) because the backend's plain /documents listing has no
   * free-text `q` support — /search is the superset: it supports q,
   * document_type and date filters, scoped to the vault, and returns a
   * {items,total,limit,offset} page. */
  async list(vaultId: string, filters?: DocumentFilters): Promise<DocumentListResponse> {
    const res = await apiClient.get<Page<Document>>(ENDPOINTS.SEARCH, {
      params: {
        vault_id: vaultId,
        q: filters?.search || undefined,
        document_type: filters?.document_type,
        date_from: filters?.date_from,
        date_to: filters?.date_to,
        limit: filters?.limit ?? 50,
        offset: filters?.offset ?? 0,
      },
    });
    return { documents: res.data.items, total: res.data.total, limit: res.data.limit, offset: res.data.offset };
  },

  async getById(id: string): Promise<DocumentDetail> {
    const res = await apiClient.get<DocumentDetail>(ENDPOINTS.DOCUMENT_BY_ID(id));
    return res.data;
  },

  async getLogs(id: string): Promise<ProcessingLog[]> {
    const res = await apiClient.get<ProcessingLog[]>(ENDPOINTS.DOCUMENT_LOGS(id));
    return res.data;
  },

  async upload(vaultId: string, req: DocumentUploadRequest, onProgress?: (pct: number) => void): Promise<Document> {
    const form = new FormData();
    form.append('vault_id', vaultId);
    form.append('file', req.file);
    const res = await apiClient.post<Document>(ENDPOINTS.DOCUMENT_UPLOAD, form, {
      headers: { 'Content-Type': 'multipart/form-data' },
      onUploadProgress: (e) => { if (e.total) onProgress?.(Math.round((e.loaded * 100) / e.total)); },
    });
    return res.data;
  },

  async delete(id: string): Promise<void> {
    await apiClient.delete(ENDPOINTS.DOCUMENT_BY_ID(id));
  },

  /** Streams the original file through the authenticated backend endpoint
   * (there are no public storage URLs) and returns it as a Blob the caller
   * can save or preview. */
  async download(id: string): Promise<{ blob: Blob; filename: string }> {
    const res = await apiClient.get(ENDPOINTS.DOCUMENT_DOWNLOAD(id), { responseType: 'blob' });
    const disposition: string = res.headers['content-disposition'] ?? '';
    const match = /filename="?([^"]+)"?/.exec(disposition);
    return { blob: res.data as Blob, filename: match?.[1] ?? 'document' };
  },

  async getLabReport(vaultId: string, documentId: string): Promise<LabReport | null> {
    const res = await apiClient.get<LabReport[]>(ENDPOINTS.LABS, { params: { vault_id: vaultId, document_id: documentId } });
    return res.data[0] ?? null;
  },

  async getPrescription(vaultId: string, documentId: string): Promise<Prescription | null> {
    const res = await apiClient.get<Prescription[]>(ENDPOINTS.PRESCRIPTIONS, { params: { vault_id: vaultId, document_id: documentId } });
    return res.data[0] ?? null;
  },

  async getDiagnosis(vaultId: string, documentId: string): Promise<Diagnosis | null> {
    const res = await apiClient.get<Diagnosis[]>(ENDPOINTS.DIAGNOSES, { params: { vault_id: vaultId, document_id: documentId } });
    return res.data[0] ?? null;
  },

  async getMedicalReport(vaultId: string, documentId: string): Promise<MedicalReport | null> {
    const res = await apiClient.get<MedicalReport[]>(ENDPOINTS.MEDICAL_REPORTS, { params: { vault_id: vaultId, document_id: documentId } });
    return res.data[0] ?? null;
  },

  async pollProcessingStatus(documentId: string): Promise<ProcessingStatus> {
    const doc = await this.getById(documentId);
    return doc.processing_status;
  },
};
