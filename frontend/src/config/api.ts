// API configuration — driven by environment variables.
// Set VITE_API_BASE_URL in .env to point at the FastAPI backend.
// Set VITE_USE_MOCK=true to use the mock layer instead.
//
// Endpoint paths below are read directly from the backend's actual routers
// (backend/app/api/v1/*.py + backend/app/main.py) — not guessed.

export const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8000';

export const USE_MOCK = import.meta.env.VITE_USE_MOCK === 'true';

export const API_PREFIX = '/api/v1';

export const ENDPOINTS = {
  // Auth
  AUTH_LOGIN: `${API_PREFIX}/auth/login`,
  AUTH_REGISTER: `${API_PREFIX}/auth/register`,
  AUTH_LOGOUT: `${API_PREFIX}/auth/logout`,
  AUTH_REFRESH: `${API_PREFIX}/auth/refresh`,

  // Users (there is no /auth/me — current-user lives under /users/me)
  USER_PROFILE: `${API_PREFIX}/users/me`,
  USER_UPDATE: `${API_PREFIX}/users/me`,
  USER_CHANGE_PASSWORD: `${API_PREFIX}/users/me/password`,

  // Vault
  VAULT: `${API_PREFIX}/vault`,
  VAULT_DASHBOARD: (vaultId: string) => `${API_PREFIX}/vault/${vaultId}/dashboard`,
  VAULT_MEMBERS: (vaultId: string) => `${API_PREFIX}/vault/${vaultId}/members`,

  // Documents (vault_id is always a required query param on the backend)
  DOCUMENTS: `${API_PREFIX}/documents`,
  DOCUMENT_UPLOAD: `${API_PREFIX}/documents/upload`,
  DOCUMENT_BY_ID: (id: string) => `${API_PREFIX}/documents/${id}`,
  DOCUMENT_DOWNLOAD: (id: string) => `${API_PREFIX}/documents/${id}/download`,
  DOCUMENT_LOGS: (id: string) => `${API_PREFIX}/documents/${id}/logs`,

  // Search (full-text + filters; supersedes GET /documents for listing/search)
  SEARCH: `${API_PREFIX}/search`,

  // Type-specific structured records (filter by ?document_id= to look one up
  // for a given document — there is no /labs/document/{id} style route)
  LABS: `${API_PREFIX}/labs`,
  PRESCRIPTIONS: `${API_PREFIX}/prescriptions`,
  DIAGNOSES: `${API_PREFIX}/diagnoses`,
  MEDICAL_REPORTS: `${API_PREFIX}/medical-reports`,

  // Timeline
  TIMELINE: `${API_PREFIX}/timeline`,
  TIMELINE_BY_ID: (id: string) => `${API_PREFIX}/timeline/${id}`,

  // Expenses
  EXPENSES: `${API_PREFIX}/expenses`,
  EXPENSES_SUMMARY: `${API_PREFIX}/expenses/summary`,
  EXPENSE_BY_ID: (id: string) => `${API_PREFIX}/expenses/${id}`,

  // Summaries
  SUMMARIES_GENERATE: `${API_PREFIX}/summaries/generate`,
  SUMMARIES_LATEST: `${API_PREFIX}/summaries/latest`,
  SUMMARY_BY_ID: (id: string) => `${API_PREFIX}/summaries/${id}`,

  // Sharing
  SHARING: `${API_PREFIX}/sharing`,
  SHARING_SHARED_WITH_ME: `${API_PREFIX}/sharing/shared-with-me`,
  SHARE_BY_ID: (id: string) => `${API_PREFIX}/sharing/${id}`,
} as const;

// Token storage keys (use sessionStorage for better security on shared devices)
export const ACCESS_TOKEN_KEY = 'hv_access_token';
export const REFRESH_TOKEN_KEY = 'hv_refresh_token';
