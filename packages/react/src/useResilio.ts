'use client';

import { useContext } from 'react';
import { ResilioContext } from './ResilioProvider.js';
import type { ErrorCatalog, PublicError, ErrorSource } from '@resilio/core';

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
  const { engine, feedback } = useResilio();

  return {
    public: (
      error: PublicError<any>,
      options?: { source?: ErrorSource; scopeKey?: string; context?: Record<string, unknown> }
    ) => {
      const decision = engine.reportPublic(
        error,
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
      engine.reportException(
        error,
        options?.context,
        options?.source || 'manual',
        options?.correlationId
      );
    },
  };
}
