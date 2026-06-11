import { isRetryableError } from './normalize.js';

/**
 * @deprecated 이 인터페이스는 레거시 재시도 정책 정의용입니다.
 */
export interface RetryPolicy {
  maxAttempts: number;
  delayMs: number;
  backoffFactor?: number;
  shouldRetry?: (error: unknown) => boolean;
}

/**
 * @deprecated 이 상수는 레거시 기본 재시도 정책입니다.
 */
export const DEFAULT_RETRY_POLICY: RetryPolicy = {
  maxAttempts: 3,
  delayMs: 1000,
  backoffFactor: 2,
  shouldRetry: isRetryableError,
};

/**
 * @deprecated 이 함수는 레거시 재시도 실행 헬퍼입니다.
 */
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
