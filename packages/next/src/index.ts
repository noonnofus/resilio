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
