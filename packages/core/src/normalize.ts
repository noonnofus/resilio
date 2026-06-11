import { ResilioError, ResilioErrorKind } from './error.js';

/**
 * @deprecated 이 인터페이스는 레거시 normalizeError 설정용입니다.
 */
export interface NormalizeOptions {
  defaultKind?: ResilioErrorKind;
  defaultMessage?: string;
  defaultPresentation?: 'inline' | 'toast' | 'modal' | 'boundary';
}

/**
 * @deprecated 이 함수는 message 기반의 레거시 에러 정규화 함수입니다.
 * 신규 Catalog 기반 `decodePublicError` 등을 사용하십시오.
 */
export function normalizeError(error: unknown, options: NormalizeOptions = {}): ResilioError {
  const defaultKind = options.defaultKind || 'unknown';
  const defaultMessage = options.defaultMessage || 'An unexpected error occurred.';
  const defaultPresentation = options.defaultPresentation || 'boundary';

  if (error === null || error === undefined) {
    return {
      kind: defaultKind,
      message: defaultMessage,
      presentation: defaultPresentation,
    };
  }

  // If it's already a ResilioError
  if (
    typeof error === 'object' &&
    'kind' in error &&
    'message' in error &&
    typeof (error as any).message === 'string'
  ) {
    const e = error as any;
    return {
      kind: e.kind,
      message: e.message,
      code: e.code,
      fields: e.fields,
      retryable: e.retryable ?? isRetryableError(e),
      presentation: e.presentation || defaultPresentation,
    };
  }

  // If it's a standard Error
  if (error instanceof Error) {
    const kind = inferErrorKindFromError(error, defaultKind);
    return {
      kind,
      message: error.message || defaultMessage,
      retryable: isRetryableError(error),
      presentation: kind === 'validation' ? 'inline' : defaultPresentation,
    };
  }

  // If it's a string
  if (typeof error === 'string') {
    return {
      kind: defaultKind,
      message: error,
      presentation: defaultPresentation,
    };
  }

  // Fallback for objects/other types
  try {
    const message = (error as any).message || String(error);
    return {
      kind: defaultKind,
      message,
      presentation: defaultPresentation,
    };
  } catch {
    return {
      kind: defaultKind,
      message: defaultMessage,
      presentation: defaultPresentation,
    };
  }
}

/**
 * @deprecated 이 함수는 레거시 ResilioError 직렬화용입니다.
 */
export function serializeError(error: ResilioError): ResilioError {
  return {
    kind: error.kind,
    message: error.message,
    code: error.code,
    fields: error.fields ? { ...error.fields } : undefined,
    retryable: error.retryable,
    presentation: error.presentation,
  };
}

function inferErrorKindFromError(error: Error, defaultKind: ResilioErrorKind): ResilioErrorKind {
  const name = error.name.toLowerCase();
  const message = error.message.toLowerCase();

  if (name.includes('validation') || message.includes('validation') || name.includes('zoderror')) {
    return 'validation';
  }
  if (
    name.includes('auth') ||
    message.includes('auth') ||
    name.includes('permission') ||
    message.includes('permission') ||
    message.includes('unauthorized') ||
    message.includes('forbidden')
  ) {
    return 'authorization';
  }
  if (
    name.includes('network') ||
    message.includes('network') ||
    message.includes('fetch') ||
    message.includes('timeout') ||
    message.includes('conn')
  ) {
    return 'network';
  }
  if (name.includes('ratelimit') || message.includes('too many requests') || message.includes('rate limit')) {
    return 'rate_limit';
  }
  if (name.includes('server') || message.includes('server error') || message.includes('internal error')) {
    return 'server';
  }

  return defaultKind;
}

/**
 * @deprecated 이 함수는 레거시 재시도 가능 에러 판별용입니다.
 */
export function isRetryableError(error: any): boolean {
  if (error && typeof error === 'object') {
    if ('retryable' in error && typeof error.retryable === 'boolean') {
      return error.retryable;
    }
    if ('kind' in error && (error.kind === 'network' || error.kind === 'rate_limit')) {
      return true;
    }
  }

  if (error instanceof Error) {
    const message = error.message.toLowerCase();
    const name = error.name.toLowerCase();
    if (
      message.includes('timeout') ||
      message.includes('network') ||
      message.includes('fetch') ||
      message.includes('too many requests') ||
      message.includes('429') ||
      message.includes('503') ||
      name.includes('timeout')
    ) {
      return true;
    }
  }

  return false;
}
