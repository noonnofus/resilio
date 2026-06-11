'use client';

// Re-export all React client components from @resilio/react
export { ResilioProvider, useResilioAlert, createResilioRootHandlers } from '@resilio/react';
export type { ResilioProviderProps, ResilioContextValue, FeedbackAdapter } from '@resilio/react';

export { useResilio, useReportError } from '@resilio/react';

// Re-export client-safe utilities from core
export { 
  ok, 
  err, 
  isOk, 
  isErr, 
  defineErrorPolicy, 
  shouldSuppress,
  defineErrorCatalog,
  createPublicError,
  decodePublicError,
  createConsoleSink,
  createCompositeSink,
  PolicyEngine,
  canonicalStringify,
  stringHash,
  BoundedDedupeStore
} from '@resilio/core';

export type { 
  Result, 
  ResilioError, 
  ResilioErrorKind, 
  ErrorCatalog, 
  PublicError, 
  FeedbackType, 
  ErrorPolicyConfig,
  ErrorDefinition,
  ErrorCode,
  PublicErrorFor,
  PublicErrorArgs,
  DecodeResult,
  ErrorSource,
  ErrorEvent,
  ErrorSink,
  PolicyEntry,
  PolicyDecision,
  DedupeContext,
  DedupePolicy,
  PolicyEngineOptions
} from '@resilio/core';

// Re-export Next.js client helpers
export { toActionState } from '../action-state.js';
// Export new useResilioState hook
export * from './useResilioState.js';
export * from '../types.js';
