/**
 * Mock API client.
 *
 * Simulates real network behaviour: latency, occasional errors, pagination.
 * Every mock service function goes through `mockRequest` so components
 * experience the same loading/error lifecycle they will with the real backend.
 */

export interface MockRequestOptions {
  /** Artificial delay in ms (default 400–900ms random) */
  delay?: number;
  /** Force an error response for testing */
  forceError?: boolean;
}

/** Simulates a realistic network round-trip */
export async function mockRequest<T>(
  fn: () => T,
  options: MockRequestOptions = {},
): Promise<T> {
  const delay = options.delay ?? Math.floor(Math.random() * 500 + 400);
  await sleep(delay);

  if (options.forceError) {
    throw mockApiError(500, 'Forced error for testing');
  }

  return fn();
}

export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export interface MockApiError {
  status: number;
  message: string;
  detail?: string;
}

export function mockApiError(status: number, message: string, detail?: string): MockApiError {
  return { status, message, detail };
}

/**
 * Simulates file upload with progress callbacks.
 * The real implementation will use Axios onUploadProgress.
 */
export async function mockUploadRequest<T>(
  fn: () => T,
  onProgress?: (pct: number) => void,
): Promise<T> {
  // Simulate progress in chunks
  for (let pct = 0; pct <= 100; pct += 20) {
    await sleep(150);
    onProgress?.(pct);
  }
  await sleep(200);
  return fn();
}
