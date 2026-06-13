// React components & hooks
export * from './ResilioProvider.js';
export * from './useResilio.js';
export * from './useResilioAlert.js';
export * from './root-handlers.js';
export * from './error-boundary-bridge.js';
export * from './ResilioErrorBoundary.js';
export * from './presentation.js';
export * from './capture.js';
export * from './browser-error-bridge.js';

// Re-export core utilities — so pure React users only install @resiliojs/react
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
