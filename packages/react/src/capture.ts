'use client';

import { useCallback, useContext } from 'react';
import type { ErrorSource } from '@resiliojs/core';
import { ResilioContext } from './ResilioProvider.js';

export interface CaptureExceptionOptions {
  source?: ErrorSource;
  correlationId?: string;
  context?: Record<string, unknown>;
}

export type ExceptionReporter = (
  error: unknown,
  options?: CaptureExceptionOptions,
) => void;

export function capture<TArgs extends readonly unknown[], TResult>(
  handler: (...args: TArgs) => TResult,
  report: ExceptionReporter,
  options?: CaptureExceptionOptions,
): (...args: TArgs) => TResult {
  return (...args) => {
    try {
      return handler(...args);
    } catch (error) {
      report(error, options);
      throw error;
    }
  };
}

export function captureAsync<TArgs extends readonly unknown[], TResult>(
  handler: (...args: TArgs) => Promise<TResult>,
  report: ExceptionReporter,
  options?: CaptureExceptionOptions,
): (...args: TArgs) => Promise<TResult> {
  return async (...args) => {
    try {
      return await handler(...args);
    } catch (error) {
      report(error, options);
      throw error;
    }
  };
}

export function useResilioHandler<TArgs extends readonly unknown[], TResult>(
  handler: (...args: TArgs) => TResult,
  options: CaptureExceptionOptions = { source: 'react.event' },
): (...args: TArgs) => TResult {
  const context = useContext(ResilioContext);

  return useCallback(
    capture(
      handler,
      (error, reportOptions) => {
        context?.reporter?.reportException(
          error,
          reportOptions?.context,
          reportOptions?.source ?? 'react.event',
          reportOptions?.correlationId,
        );
      },
      options,
    ),
    [context?.reporter, handler, options],
  );
}
