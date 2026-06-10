import type { StandardSchemaV1 } from '@standard-schema/spec';

export type ErrorDefinition = { params?: StandardSchemaV1 };
export type ErrorCatalog = Record<string, ErrorDefinition>;

export function defineErrorCatalog<const T extends ErrorCatalog>(catalog: T): T {
  return catalog;
}

export type ParamsOf<D> = D extends { params: infer S extends StandardSchemaV1 }
  ? StandardSchemaV1.InferOutput<S>
  : never;

export type PublicError<T extends ErrorCatalog> = {
  [C in keyof T & string]:
    T[C] extends { params: StandardSchemaV1 }
      ? { code: C; params: ParamsOf<T[C]>; correlationId?: string }
      : { code: C; params?: never; correlationId?: string }
}[keyof T & string];

export type ErrorCode<T extends ErrorCatalog> = keyof T & string;

export type PublicErrorFor<
  T extends ErrorCatalog,
  C extends ErrorCode<T>,
> = Extract<PublicError<T>, { code: C }>;

export type PublicErrorArgs<T extends ErrorCatalog, C extends keyof T & string> =
  T[C] extends { params: StandardSchemaV1 }
    ? [params: StandardSchemaV1.InferInput<T[C]['params']>, correlationId?: string]
    : [params?: never, correlationId?: string];

export function createPublicError<
  T extends ErrorCatalog,
  C extends keyof T & string,
>(catalog: T, code: C, ...args: PublicErrorArgs<T, C>): PublicError<T> {
  const [params, correlationId] = args;
  const definition = catalog[code];
  
  if (definition && 'params' in definition && definition.params) {
    const schema = definition.params;
    const result = schema['~standard'].validate(params);
    if (result instanceof Promise) {
      throw new Error(`Standard Schema for code ${code} returned a Promise. Async validation is not supported in createPublicError.`);
    }
    if (result.issues) {
      throw new Error(`Validation failed for PublicError ${code}: ${JSON.stringify(result.issues)}`);
    }
    return {
      code,
      params: result.value,
      correlationId,
    } as any;
  }
  
  return {
    code,
    correlationId,
  } as any;
}

export type DecodeResult<T extends ErrorCatalog> =
  | { ok: true; value: PublicError<T> }
  | { ok: false; reason: 'invalid_shape' | 'unknown_code' | 'invalid_params' };

export async function decodePublicError<T extends ErrorCatalog>(
  catalog: T,
  input: unknown,
): Promise<DecodeResult<T>> {
  if (!input || typeof input !== 'object') {
    return { ok: false, reason: 'invalid_shape' };
  }
  
  const { code, params, correlationId } = input as any;
  if (typeof code !== 'string') {
    return { ok: false, reason: 'invalid_shape' };
  }
  
  if (!(code in catalog)) {
    return { ok: false, reason: 'unknown_code' };
  }
  
  const definition = catalog[code];
  if (definition && 'params' in definition && definition.params) {
    const schema = definition.params;
    const validateResult = await schema['~standard'].validate(params);
    if (validateResult.issues) {
      return { ok: false, reason: 'invalid_params' };
    }
    return {
      ok: true,
      value: {
        code,
        params: validateResult.value,
        correlationId,
      } as any,
    };
  }
  
  return {
    ok: true,
    value: {
      code,
      correlationId,
    } as any,
  };
}

export type ErrorSource =
  | 'manual'
  | 'react.caught'
  | 'react.uncaught'
  | 'react.recoverable'
  | 'next.request'
  | 'next.action'
  | 'query'
  | 'mutation';

export type ErrorEvent<T extends ErrorCatalog> =
  | {
      occurrenceId: string;
      timestamp: number;
      source: ErrorSource;
      kind: 'public';
      error: PublicError<T>;
      context?: Record<string, unknown>;
    }
  | {
      occurrenceId: string;
      timestamp: number;
      source: ErrorSource;
      kind: 'exception';
      error: unknown;
      correlationId?: string;
      context?: Record<string, unknown>;
    }
  | {
      occurrenceId: string;
      timestamp: number;
      source: ErrorSource;
      kind: 'invalid_public_error';
      reason: string;
      context?: Record<string, unknown>;
    };

export interface ErrorSink<T extends ErrorCatalog> {
  report(event: ErrorEvent<T>): void | Promise<void>;
}

export function createConsoleSink<T extends ErrorCatalog>(): ErrorSink<T> {
  return {
    report(event) {
      console.error(`[Resilio ErrorSink]`, JSON.stringify(event, null, 2));
    },
  };
}

export function createCompositeSink<T extends ErrorCatalog>(
  sinks: ErrorSink<T>[]
): ErrorSink<T> {
  return {
    async report(event) {
      await Promise.all(sinks.map(sink => {
        try {
          return sink.report(event);
        } catch (e) {
          console.error('[Resilio CompositeSink Error]', e);
        }
      }));
    },
  };
}

export type FeedbackType = 'inline' | 'toast' | 'modal' | 'silent';

export type PolicyEntry<P> = {
  feedback: FeedbackType;
  severity?: 'info' | 'warning' | 'error';
  message: string | ((params: P) => string);
  field?: string;
  dedupe?: {
    windowMs: number;
    fingerprint?: (params: P) => string;
  };
};

export type ErrorPolicyConfig<T extends ErrorCatalog> = {
  [C in keyof T & string]: PolicyEntry<ParamsOf<T[C]>>;
};

export function defineErrorPolicy<T extends ErrorCatalog>(
  catalog: T,
  config: ErrorPolicyConfig<T>,
): ErrorPolicyConfig<T> {
  const catalogKeys = Object.keys(catalog);
  const configKeys = Object.keys(config);
  
  for (const key of catalogKeys) {
    if (!(key in config)) {
      console.warn(`[Resilio Warning] Catalog key "${key}" is missing in Error Policy configuration.`);
    }
  }
  
  for (const key of configKeys) {
    if (!(key in catalog)) {
      console.warn(`[Resilio Warning] Policy key "${key}" does not exist in Error Catalog.`);
    }
  }
  
  return config;
}

export interface PolicyDecision {
  feedback: FeedbackType;
  severity: 'info' | 'warning' | 'error';
  message: string;
  field?: string;
  suppressed: boolean;
  fingerprint?: string;
}

export interface DedupeContext<P> {
  source: ErrorSource;
  scopeKey?: string;
  code: string;
  feedback: FeedbackType;
  field?: string;
  params: P;
}

export interface DedupePolicy<P> {
  windowMs: number;
  scope?: 'engine' | 'source' | 'custom';
  fingerprint?: (context: DedupeContext<P>) => string;
}

export function canonicalStringify(val: any): string {
  if (val === null || val === undefined) return '';
  if (typeof val !== 'object') return String(val);
  if (Array.isArray(val)) {
    return '[' + val.map(canonicalStringify).join(',') + ']';
  }
  const sortedKeys = Object.keys(val).sort();
  const pairs = sortedKeys.map(k => `${k}:${canonicalStringify(val[k])}`);
  return '{' + pairs.join(',') + '}';
}

export function stringHash(str: string): string {
  let hash = 5381;
  for (let i = 0; i < str.length; i++) {
    hash = (hash * 33) ^ str.charCodeAt(i);
  }
  return (hash >>> 0).toString(36);
}

export class BoundedDedupeStore {
  private cache = new Map<string, number>();
  private readonly maxEntries: number;
  
  constructor(maxEntries = 1000) {
    this.maxEntries = maxEntries;
  }
  
  shouldSuppress(fingerprint: string, now: number, windowMs: number): boolean {
    const lastFired = this.cache.get(fingerprint);
    if (lastFired !== undefined && now - lastFired < windowMs) {
      return true;
    }
    if (this.cache.size >= this.maxEntries) {
      const oldestKey = this.cache.keys().next().value;
      if (oldestKey !== undefined) {
        this.cache.delete(oldestKey);
      }
    }
    this.cache.set(fingerprint, now);
    return false;
  }
}

export interface PolicyEngineOptions<T extends ErrorCatalog> {
  catalog: T;
  policy: ErrorPolicyConfig<T>;
  sink?: ErrorSink<T>;
  idProvider?: () => string;
}

export class PolicyEngine<T extends ErrorCatalog> {
  private catalog: T;
  private policy: ErrorPolicyConfig<T>;
  private sink?: ErrorSink<T>;
  private idProvider: () => string;
  private dedupeStore = new BoundedDedupeStore();

  constructor(options: PolicyEngineOptions<T>) {
    this.catalog = options.catalog;
    this.policy = options.policy;
    this.sink = options.sink;
    this.idProvider = options.idProvider || (() => Math.random().toString(36).substring(2, 15));
  }

  public reportPublic(
    error: PublicError<T>,
    context?: Record<string, unknown>,
    source: ErrorSource = 'manual',
    scopeKey?: string
  ): PolicyDecision {
    const occurrenceId = this.idProvider();
    const timestamp = Date.now();

    if (this.sink) {
      try {
        this.sink.report({
          occurrenceId,
          timestamp,
          source,
          kind: 'public',
          error,
          context,
        });
      } catch (e) {
        console.error('[Resilio Sink Error]', e);
      }
    }

    const policyEntry = this.policy[error.code];
    const feedback: FeedbackType = policyEntry?.feedback || 'toast';
    const severity = policyEntry?.severity || 'error';
    const field = policyEntry?.field;
    
    let message = '';
    if (policyEntry) {
      if (typeof policyEntry.message === 'function') {
        message = (policyEntry.message as any)(error.params);
      } else {
        message = policyEntry.message;
      }
    } else {
      message = `An error occurred: ${error.code}`;
    }

    let suppressed = false;
    let fingerprintStr = '';

    if (policyEntry?.dedupe) {
      const dedupePolicy = policyEntry.dedupe;
      const windowMs = dedupePolicy.windowMs;
      
      if (dedupePolicy.fingerprint) {
        fingerprintStr = dedupePolicy.fingerprint(error.params as any);
      } else {
        const canonicalHash = stringHash(canonicalStringify(error.params));
        fingerprintStr = `${source}::${scopeKey || ''}::${error.code}::${feedback}::${field || ''}::${canonicalHash}`;
      }

      suppressed = this.dedupeStore.shouldSuppress(fingerprintStr, timestamp, windowMs);
    }

    return {
      feedback,
      severity,
      message,
      field,
      suppressed,
      fingerprint: fingerprintStr || undefined,
    };
  }

  public reportException(
    error: unknown,
    context?: Record<string, unknown>,
    source: ErrorSource = 'manual',
    correlationId?: string
  ): void {
    const occurrenceId = this.idProvider();
    const timestamp = Date.now();

    if (this.sink) {
      try {
        this.sink.report({
          occurrenceId,
          timestamp,
          source,
          kind: 'exception',
          error,
          correlationId,
          context,
        });
      } catch (e) {
        console.error('[Resilio Sink Error]', e);
      }
    }
  }

  public reportInvalidPublicError(
    reason: string,
    context?: Record<string, unknown>,
    source: ErrorSource = 'manual'
  ): void {
    const occurrenceId = this.idProvider();
    const timestamp = Date.now();

    if (this.sink) {
      try {
        this.sink.report({
          occurrenceId,
          timestamp,
          source,
          kind: 'invalid_public_error',
          reason,
          context,
        });
      } catch (e) {
        console.error('[Resilio Sink Error]', e);
      }
    }
  }
}

// 기존 테스트 및 하위 호환을 위한 레거시 코드 보존
export type ResilioErrorKind =
  | 'validation'
  | 'authorization'
  | 'network'
  | 'rate_limit'
  | 'server'
  | 'unknown';

export interface ResilioError {
  kind: ResilioErrorKind;
  message: string;
  code?: string;
  fields?: Record<string, string[]>;
  retryable?: boolean;
  presentation?: 'inline' | 'toast' | 'modal' | 'boundary';
}

export function isResilioError(value: any): value is ResilioError {
  return (
    value !== null &&
    typeof value === 'object' &&
    typeof value.message === 'string' &&
    (value.kind === 'validation' ||
      value.kind === 'authorization' ||
      value.kind === 'network' ||
      value.kind === 'rate_limit' ||
      value.kind === 'server' ||
      value.kind === 'unknown')
  );
}

// 레거시 shouldSuppress 함수 (기존 파일 호환용)
export interface DedupeCheckOptions {
  code: string;
  params?: any;
  field?: string;
  dedupeMs?: number;
}
const legacyLastFiredMap = new Map<string, number>();
export function shouldSuppress(options: DedupeCheckOptions): boolean {
  const { code, params, field, dedupeMs } = options;
  if (!dedupeMs || dedupeMs <= 0) {
    return false;
  }
  const paramsKey = params ? JSON.stringify(params) : '';
  const fieldKey = field || '';
  const fingerprint = `${code}::${paramsKey}::${fieldKey}`;
  const now = Date.now();
  const lastFired = legacyLastFiredMap.get(fingerprint);
  if (lastFired !== undefined && now - lastFired < dedupeMs) {
    return true;
  }
  legacyLastFiredMap.set(fingerprint, now);
  return false;
}
