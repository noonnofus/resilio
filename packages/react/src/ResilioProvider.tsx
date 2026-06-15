'use client';

import React, { createContext } from 'react';
import type {
  BuiltInChannel,
  ErrorCatalog,
  ExceptionReporter,
  PolicyEngine,
  PolicyDecision,
  PresentationEvaluator,
  PublicErrorValue,
} from '@resiliojs/core';
import {
  ResilioPresentationProvider,
  type RendererRegistry,
} from './presentation.js';

export type FeedbackAdapter = (
  decision: PolicyDecision,
  error: PublicErrorValue,
) => void;

export interface ResilioContextValue<T extends ErrorCatalog = ErrorCatalog> {
  engine?: PolicyEngine<T>;
  reporter?: ExceptionReporter;
  feedback?: FeedbackAdapter;
}

export const ResilioContext = createContext<ResilioContextValue<ErrorCatalog> | null>(null);

export interface ResilioProviderProps<
  T extends ErrorCatalog,
  TChannel extends string = BuiltInChannel,
> {
  children: React.ReactNode;
  engine?: PolicyEngine<T>;
  reporter?: ExceptionReporter;
  feedback?: FeedbackAdapter;
  evaluator?: PresentationEvaluator<T, TChannel>;
  renderers?: RendererRegistry<TChannel>;
}

export function ResilioProvider<
  T extends ErrorCatalog,
  TChannel extends string = BuiltInChannel,
>({
  children,
  engine,
  reporter,
  feedback,
  evaluator,
  renderers,
}: ResilioProviderProps<T, TChannel>) {
  const content = (
    <ResilioContext.Provider
      value={{
        engine: engine as unknown as PolicyEngine<ErrorCatalog> | undefined,
        reporter: reporter ?? engine,
        feedback,
      }}
    >
      {children}
    </ResilioContext.Provider>
  );

  if (!evaluator) {
    return content;
  }

  return (
    <ResilioPresentationProvider evaluator={evaluator} renderers={renderers}>
      {content}
    </ResilioPresentationProvider>
  );
}
