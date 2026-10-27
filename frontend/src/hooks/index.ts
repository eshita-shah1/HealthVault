import { useCallback, useEffect, useReducer, useRef, useState } from 'react';
import { Documents, Expenses, Timeline, Summary, Sharing } from '../services';
import { getErrorMessage } from '../services/api';
import { useVault } from '../context/VaultContext';
import type {
  Diagnosis, Document, DocumentFilters, DocumentListResponse,
  MedicalExpense, CreateExpenseRequest, ExpenseSummary,
  TimelineEvent, TimelineFilters,
  HealthSummary,
  SharedAccess, CreateShareRequest,
  LabReport, MedicalReport, Prescription,
  ProcessingStatus,
} from '../types';

// ─────────────────────────────────────────────
// Generic async reducer pattern
// ─────────────────────────────────────────────
type AsyncState<T> =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'success'; data: T }
  | { status: 'error'; error: string };

type AsyncAction<T> =
  | { type: 'FETCH' }
  | { type: 'SUCCESS'; data: T }
  | { type: 'ERROR'; error: string };

function asyncReducer<T>(state: AsyncState<T>, action: AsyncAction<T>): AsyncState<T> {
  switch (action.type) {
    case 'FETCH':   return { status: 'loading' };
    case 'SUCCESS': return { status: 'success', data: action.data };
    case 'ERROR':   return { status: 'error', error: action.error };
    default:        return state;
  }
}

function useAsync<T>(initial: AsyncState<T> = { status: 'idle' }) {
  const [state, dispatch] = useReducer(asyncReducer<T>, initial);
  const run = useCallback(async (promise: Promise<T>) => {
    dispatch({ type: 'FETCH' });
    try {
      const data = await promise;
      dispatch({ type: 'SUCCESS', data });
      return data;
    } catch (err: unknown) {
      dispatch({ type: 'ERROR', error: getErrorMessage(err) });
      throw err;
    }
  }, []);
  return { state, run, dispatch };
}

// ─────────────────────────────────────────────
// useDocuments — list/search within the current vault
// ─────────────────────────────────────────────
export function useDocuments(initialFilters?: DocumentFilters) {
  const { vaultId } = useVault();
  const { state, run } = useAsync<DocumentListResponse>();
  const [filters, setFilters] = useState<DocumentFilters>(initialFilters ?? {});

  const fetch = useCallback((f?: DocumentFilters) => {
    if (!vaultId) return Promise.resolve(undefined as unknown as DocumentListResponse);
    return run(Documents.list(vaultId, f ?? filters));
  }, [vaultId, filters, run]);

  useEffect(() => { if (vaultId) fetch(filters); }, [vaultId, filters]); // eslint-disable-line

  const upload = useCallback(async (file: File, onProgress?: (pct: number) => void) => {
    if (!vaultId) throw new Error('No vault available yet');
    return Documents.upload(vaultId, { file }, onProgress);
  }, [vaultId]);

  const remove = useCallback(async (id: string) => {
    await Documents.delete(id);
    fetch();
  }, [fetch]);

  return { state, filters, setFilters, refresh: fetch, upload, remove };
}

// ─────────────────────────────────────────────
// useDocument (single) — detail + type-specific structured record
// ─────────────────────────────────────────────
export function useDocument(id: string) {
  const { vaultId } = useVault();
  const { state, run } = useAsync<Document>();
  const labState = useAsync<LabReport | null>();
  const presState = useAsync<Prescription | null>();
  const diagnosisState = useAsync<Diagnosis | null>();
  const reportState = useAsync<MedicalReport | null>();

  useEffect(() => {
    run(Documents.getById(id));
  }, [id]); // eslint-disable-line

  const fetchLabReport = useCallback(() => {
    if (vaultId) labState.run(Documents.getLabReport(vaultId, id));
  }, [vaultId, id]); // eslint-disable-line

  const fetchPrescription = useCallback(() => {
    if (vaultId) presState.run(Documents.getPrescription(vaultId, id));
  }, [vaultId, id]); // eslint-disable-line

  const fetchDiagnosis = useCallback(() => {
    if (vaultId) diagnosisState.run(Documents.getDiagnosis(vaultId, id));
  }, [vaultId, id]); // eslint-disable-line

  const fetchMedicalReport = useCallback(() => {
    if (vaultId) reportState.run(Documents.getMedicalReport(vaultId, id));
  }, [vaultId, id]); // eslint-disable-line

  return {
    state,
    labState: labState.state, presState: presState.state,
    diagnosisState: diagnosisState.state, reportState: reportState.state,
    fetchLabReport, fetchPrescription, fetchDiagnosis, fetchMedicalReport,
  };
}

// ─────────────────────────────────────────────
// useProcessingPoller
// Polls processing status every 3s until terminal state
// ─────────────────────────────────────────────
const TERMINAL_STATUSES: ProcessingStatus[] = ['PROCESSED', 'NEEDS_REVIEW', 'FAILED'] as ProcessingStatus[];

export function useProcessingPoller(documentId: string | null, onComplete?: (status: ProcessingStatus) => void) {
  const [status, setStatus] = useState<ProcessingStatus | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!documentId) return;
    const poll = async () => {
      try {
        const s = await Documents.pollProcessingStatus(documentId);
        setStatus(s);
        if (TERMINAL_STATUSES.includes(s)) {
          clearInterval(intervalRef.current!);
          onComplete?.(s);
        }
      } catch { clearInterval(intervalRef.current!); }
    };
    poll();
    intervalRef.current = setInterval(poll, 3000);
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [documentId]); // eslint-disable-line

  return status;
}

// ─────────────────────────────────────────────
// useTimeline
// ─────────────────────────────────────────────
export function useTimeline(initialFilters?: TimelineFilters) {
  const { vaultId } = useVault();
  const { state, run } = useAsync<TimelineEvent[]>();
  const [filters, setFilters] = useState<TimelineFilters>(initialFilters ?? {});

  const fetch = useCallback((f?: TimelineFilters) => {
    if (!vaultId) return Promise.resolve(undefined as unknown as TimelineEvent[]);
    return run(Timeline.list(vaultId, f ?? filters));
  }, [vaultId, filters, run]);

  useEffect(() => { if (vaultId) fetch(filters); }, [vaultId, filters]); // eslint-disable-line

  return { state, filters, setFilters, refresh: fetch };
}

// ─────────────────────────────────────────────
// useExpenses
// ─────────────────────────────────────────────
export function useExpenses() {
  const { vaultId } = useVault();
  const listState = useAsync<MedicalExpense[]>();
  const summaryState = useAsync<ExpenseSummary>();

  const fetchAll = useCallback(() => {
    if (!vaultId) return;
    listState.run(Expenses.list(vaultId));
    summaryState.run(Expenses.summary(vaultId));
  }, [vaultId]); // eslint-disable-line

  useEffect(() => { if (vaultId) fetchAll(); }, [vaultId]); // eslint-disable-line

  const create = useCallback(async (req: CreateExpenseRequest) => {
    if (!vaultId) throw new Error('No vault available yet');
    const result = await Expenses.create(vaultId, req);
    fetchAll();
    return result;
  }, [vaultId, fetchAll]);

  const remove = useCallback(async (id: string) => {
    await Expenses.delete(id);
    fetchAll();
  }, [fetchAll]);

  return { listState: listState.state, summaryState: summaryState.state, create, remove, refresh: fetchAll };
}

// ─────────────────────────────────────────────
// useHealthSummary
// ─────────────────────────────────────────────
export function useHealthSummary() {
  const { vaultId } = useVault();
  const { state, run, dispatch } = useAsync<HealthSummary>();
  const [generating, setGenerating] = useState(false);

  const fetch = useCallback(() => {
    if (!vaultId) return Promise.resolve(undefined as unknown as HealthSummary);
    return run(Summary.getLatest(vaultId));
  }, [vaultId, run]);

  useEffect(() => { if (vaultId) fetch(); }, [vaultId]); // eslint-disable-line

  const generate = useCallback(async () => {
    if (!vaultId) throw new Error('No vault available yet');
    setGenerating(true);
    try {
      const result = await Summary.generate(vaultId);
      dispatch({ type: 'SUCCESS', data: result });
      return result;
    } finally {
      setGenerating(false);
    }
  }, [vaultId, dispatch]);

  return { state, generating, generate, refresh: fetch };
}

// ─────────────────────────────────────────────
// useSharing
// ─────────────────────────────────────────────
export function useSharing() {
  const { vaultId } = useVault();
  const { state, run } = useAsync<SharedAccess[]>();
  const [creating, setCreating] = useState(false);

  const fetch = useCallback(() => {
    if (!vaultId) return Promise.resolve(undefined as unknown as SharedAccess[]);
    return run(Sharing.list(vaultId));
  }, [vaultId, run]);

  useEffect(() => { if (vaultId) fetch(); }, [vaultId]); // eslint-disable-line

  const create = useCallback(async (req: CreateShareRequest): Promise<SharedAccess> => {
    if (!vaultId) throw new Error('No vault available yet');
    setCreating(true);
    try {
      const result = await Sharing.create(vaultId, req);
      fetch();
      return result;
    } finally {
      setCreating(false);
    }
  }, [vaultId, fetch]);

  const revoke = useCallback(async (id: string) => {
    await Sharing.revoke(id);
    fetch();
  }, [fetch]);

  return { state, creating, create, revoke, refresh: fetch };
}
