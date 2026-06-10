// React components & hooks
export * from './ResilioProvider.js';
export * from './ResilioBoundary.js';
export * from './useResilio.js';
export * from './useResilioAlert.js';
export * from './root-handlers.js';

// Re-export core utilities — so pure React users only install @resilio/react
export { 
  ok, 
  err, 
  isOk, 
  isErr, 
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
  BoundedDedupeStore
} from '@resilio/core';

export type { 
  Result, 
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
  PolicyEngineOptions
} from '@resilio/core';

export { ResilioEmitter, globalResilioEmitter, ResilioLogger, resilioLogger, defaultConsoleLogger } from '@resilio/core';
