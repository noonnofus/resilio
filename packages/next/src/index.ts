// Server-safe exports (safe to import in Server Components & Server Actions)
export * from './action.js';
export * from './action-state.js';
export * from './serializer.js';
export * from './route-error.js';
export * from './types.js';

// Re-export core types and utilities for single-package DX
export { 
  ok, 
  err, 
  isOk, 
  isErr, 
  isPublicResult,
  normalizeError, 
  serializeError, 
  isRetryableError, 
  withRetry,
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
} from '@resiliojs/core';

export type { 
  Result, 
  PublicResult,
  ResilioError, 
  ResilioErrorKind, 
  RetryPolicy, 
  NormalizeOptions, 
  LoggerAdapter,
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
} from '@resiliojs/core';

export { ResilioEmitter, globalResilioEmitter, ResilioLogger, resilioLogger, defaultConsoleLogger } from '@resiliojs/core';
