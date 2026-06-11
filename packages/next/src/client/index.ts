'use client';

// Re-export all React client components from @resilio/react
export {
  ResilioProvider,
  ResilioErrorBoundary,
  ResilioPresentationHost,
  ResilioPresentationProvider,
  usePresentError,
  useOptionalPresentError,
  useResilioInline,
  useResilioAlert,
  createResilioRootHandlers,
  capture,
  captureAsync,
  useResilioHandler,
  installResilioBrowserErrorBridge,
  useResilioBrowserErrorBridge,
} from '@resilio/react';
export type {
  ActivePresentation,
  FeedbackAdapter,
  PresentationRenderer,
  PresentationRendererInput,
  RendererRegistry,
  ResilioContextValue,
  ResilioErrorBoundaryProps,
  ResilioErrorFallbackProps,
  ResilioPresentationHostProps,
  ResilioPresentationProviderProps,
  ResilioProviderProps,
} from '@resilio/react';

export { useResilio, useReportError } from '@resilio/react';
export { useOptionalReportError } from '@resilio/react';

// Re-export client-safe utilities from core
export { 
  ok, 
  err, 
  isOk, 
  isErr, 
  isPublicResult,
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
  BoundedDedupeStore,
  definePresentationPolicy,
  createPresentationEvaluator
} from '@resilio/core';

export type { 
  Result, 
  PublicResult,
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
  PolicyEngineOptions,
  BuiltInChannel,
  PresentationContext,
  PresentationDecision,
  PresentationPlan,
  PresentationPlanInput,
  PresentationRule,
  PresentationPolicyConfig,
  EvaluatedPresentationDecision,
  PresentationInvalidReason,
  PresentationEvaluationResult,
  PresentationEvaluator,
  PresentationEvaluatorOptions,
  PresentationObservationEvent,
  PresentationObserver
} from '@resilio/core';

// Re-export Next.js client helpers
export { toActionState } from '../action-state.js';
// Export new useResilioState hook
export * from './useResilioState.js';
export * from './useResilioRouteError.js';
export * from '../types.js';
