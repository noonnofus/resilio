'use client';

import React, { createContext } from 'react';
import type { ErrorCatalog, PolicyEngine, PolicyDecision, PublicErrorValue } from '@resilio/core';

export type FeedbackAdapter = (
  decision: PolicyDecision,
  error: PublicErrorValue,
) => void;

export interface ResilioContextValue<T extends ErrorCatalog = ErrorCatalog> {
  engine: PolicyEngine<T>;
  feedback?: FeedbackAdapter;
}

export const ResilioContext = createContext<ResilioContextValue<ErrorCatalog> | null>(null);

export interface ResilioProviderProps<T extends ErrorCatalog> {
  children: React.ReactNode;
  engine: PolicyEngine<T>;
  feedback?: FeedbackAdapter;
}

export function ResilioProvider<T extends ErrorCatalog>({
  children,
  engine,
  feedback,
}: ResilioProviderProps<T>) {
  return (
    <ResilioContext.Provider
      value={{
        engine: engine as unknown as PolicyEngine<ErrorCatalog>,
        feedback,
      }}
    >
      {children}
    </ResilioContext.Provider>
  );
}
