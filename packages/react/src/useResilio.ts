'use client';

import { useContext } from 'react';
import { ResilioContext } from './ResilioProvider.js';
import type { ErrorCatalog, PublicError, PublicErrorValue, ErrorSource } from '@resiliojs/core';

export function useResilio() {
  const context = useContext(ResilioContext);
  if (!context) {
    throw new Error(
      'useResilio must be used within a ResilioProvider. ' +
      'Please wrap your application root with <ResilioProvider>.'
    );
  }
  return context;
}

export function useReportError() {
  useResilio();
  const report = useOptionalReportError();
  if (!report) {
    throw new Error('Legacy report APIs require the engine prop on ResilioProvider.');
  }
  return report;
}

export function useOptionalReportError() {
  const context = useContext(ResilioContext);
  const engine = context?.engine;
  const reporter = context?.reporter;
  const feedback = context?.feedback;
  if (!engine && !reporter) {
    return null;
  }

  return {
    public: (
      error: PublicErrorValue,
      options?: { source?: ErrorSource; scopeKey?: string; context?: Record<string, unknown> }
    ) => {
      if (!engine) {
        throw new Error('Legacy public report APIs require the engine prop on ResilioProvider.');
      }
      const decision = engine.reportPublic(
        error as PublicError<ErrorCatalog>,
        options?.context,
        options?.source || 'manual',
        options?.scopeKey
      );

      if (!decision.suppressed && feedback) {
        feedback(decision, error);
      }
      return decision;
    },
    exception: (
      error: unknown,
      options?: { source?: ErrorSource; correlationId?: string; context?: Record<string, unknown> }
    ) => {
      reporter?.reportException(
        error,
        options?.context,
        options?.source || 'manual',
        options?.correlationId
      );
    },
    invalidPublic: (
      reason: string,
      options?: { source?: ErrorSource; context?: Record<string, unknown> }
    ) => {
      engine?.reportInvalidPublicError(
        reason,
        options?.context,
        options?.source || 'manual',
      );
    },
  };
}
