/**
 * Real Axios API client.
 * - Attaches JWT access token from sessionStorage to every request.
 * - On 401, attempts token refresh once, then redirects to /login.
 * - All services import this client when VITE_USE_MOCK=false.
 */
import axios, { type AxiosInstance, type AxiosRequestConfig, AxiosError } from 'axios';
import { API_BASE_URL, ACCESS_TOKEN_KEY, REFRESH_TOKEN_KEY, ENDPOINTS } from '../config/api';

const apiClient: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  headers: { 'Content-Type': 'application/json' },
  timeout: 30000,
});

// ── Request interceptor: attach token ──────────
apiClient.interceptors.request.use((config) => {
  const token = sessionStorage.getItem(ACCESS_TOKEN_KEY);
  if (token && config.headers) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// ── Response interceptor: handle 401 + refresh ─
let isRefreshing = false;
let failedQueue: Array<{ resolve: (v: unknown) => void; reject: (e: unknown) => void }> = [];

function processQueue(error: unknown, token: string | null = null) {
  failedQueue.forEach((p) => (error ? p.reject(error) : p.resolve(token)));
  failedQueue = [];
}

apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as AxiosRequestConfig & { _retry?: boolean };
    if (error.response?.status === 401 && !originalRequest._retry) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => failedQueue.push({ resolve, reject }))
          .then((token) => {
            if (originalRequest.headers) originalRequest.headers.Authorization = `Bearer ${token}`;
            return apiClient(originalRequest);
          })
          .catch(Promise.reject);
      }
      originalRequest._retry = true;
      isRefreshing = true;
      const refreshToken = sessionStorage.getItem(REFRESH_TOKEN_KEY);
      try {
        const res = await axios.post(`${API_BASE_URL}${ENDPOINTS.AUTH_REFRESH}`, { refresh_token: refreshToken });
        const newToken = res.data.access_token;
        sessionStorage.setItem(ACCESS_TOKEN_KEY, newToken);
        processQueue(null, newToken);
        if (originalRequest.headers) originalRequest.headers.Authorization = `Bearer ${newToken}`;
        return apiClient(originalRequest);
      } catch (err) {
        processQueue(err, null);
        sessionStorage.clear();
        window.location.href = '/login';
        return Promise.reject(err);
      } finally {
        isRefreshing = false;
      }
    }
    return Promise.reject(error);
  },
);

export default apiClient;

/**
 * Extracts a user-safe message from a failed request.
 * FastAPI error responses are `{ detail: string | {msg, ...}[] }`; axios's own
 * `err.message` (e.g. "Request failed with status code 401") is a fallback
 * for network errors / timeouts where there is no response body at all.
 */
export function getErrorMessage(err: unknown, fallback = 'Something went wrong. Please try again.'): string {
  if (axios.isAxiosError(err)) {
    const detail = (err.response?.data as { detail?: unknown } | undefined)?.detail;
    if (typeof detail === 'string') return detail;
    if (Array.isArray(detail) && detail.length > 0) {
      const first = detail[0] as { msg?: string };
      if (typeof first?.msg === 'string') return first.msg;
    }
    if (err.code === 'ECONNABORTED') return 'The request timed out. Please try again.';
    if (!err.response) return 'Unable to connect to Health Vault. Check your connection and try again.';
  }
  if (err instanceof Error && err.message) return err.message;
  return fallback;
}
