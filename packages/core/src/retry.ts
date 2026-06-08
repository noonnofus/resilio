import { isRetryableError } from './normalize.js';

export interface RetryPolicy {
  maxAttempts: number;
  delayMs: number;
  backoffFactor?: number;
  shouldRetry?: (error: unknown) => boolean;
}

export const DEFAULT_RETRY_POLICY: RetryPolicy = {
  maxAttempts: 3,
  delayMs: 1000,
  backoffFactor: 2,
  shouldRetry: isRetryableError,
};

export async function withRetry<T>(
  fn: () => Promise<T>,
  policy: Partial<RetryPolicy> = {}
): Promise<T> {
  const activePolicy = { ...DEFAULT_RETRY_POLICY, ...policy };
  let lastError: unknown;
  let delay = activePolicy.delayMs;

  for (let attempt = 1; attempt <= activePolicy.maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;

      const shouldRetry = activePolicy.shouldRetry
        ? activePolicy.shouldRetry(error)
        : isRetryableError(error);

      if (!shouldRetry || attempt === activePolicy.maxAttempts) {
        throw error;
      }

      await new Promise((resolve) => setTimeout(resolve, delay));
      delay = delay * (activePolicy.backoffFactor ?? 1);
    }
  }

  throw lastError;
}
