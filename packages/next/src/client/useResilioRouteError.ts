'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useOptionalReportError } from '@resilio/react';

export interface UseResilioRouteErrorOptions {
  maxResets?: number;
  resetWindowMs?: number;
}

export interface ResilioRouteErrorState {
  reset(): void;
  resetBlocked: boolean;
}

export function useResilioRouteError(
  error: Error & { digest?: string },
  reset: () => void,
  options: UseResilioRouteErrorOptions = {},
): ResilioRouteErrorState {
  const report = useOptionalReportError();
  const reported = useRef<Error | null>(null);
  const resetTimestamps = useRef<number[]>([]);
  const [resetBlocked, setResetBlocked] = useState(false);

  useEffect(() => {
    if (reported.current === error) return;
    reported.current = error;
    report?.exception(error, {
      source: 'next.route',
      correlationId: error.digest,
      context: { digest: error.digest },
    });
  }, [error, report]);

  const guardedReset = useCallback(() => {
    const now = Date.now();
    const windowMs = options.resetWindowMs ?? 1_000;
    const maxResets = options.maxResets ?? 3;
    resetTimestamps.current = resetTimestamps.current.filter(
      (timestamp) => now - timestamp < windowMs,
    );
    if (resetTimestamps.current.length >= maxResets) {
      setResetBlocked(true);
      return;
    }
    resetTimestamps.current.push(now);
    reset();
  }, [options.maxResets, options.resetWindowMs, reset]);

  return { reset: guardedReset, resetBlocked };
}
