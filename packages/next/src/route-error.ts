import type { Instrumentation } from 'next';
import type { ErrorCatalog, ErrorSink } from '@resiliojs/core';
import { reportToSinkBestEffort } from '@resiliojs/core';

/**
 * Next.js 15+ instrumentation.ts의 onRequestError 규격에 맞는 오류 관측성 핸들러를 생성합니다.
 * request headers와 query string은 보안을 위해 기본적으로 전달하지 않습니다.
 */
export function createResilioOnRequestError<T extends ErrorCatalog>(
  sink: ErrorSink<T>
): Instrumentation.onRequestError {
  return async (error, request, context) => {
    const safePath = request.path ? request.path.split('?')[0] : '';
    const digest = getErrorDigest(error);
    const occurrenceId = Math.random().toString(36).substring(2, 15);
    const timestamp = Date.now();

    await reportToSinkBestEffort(sink, {
      occurrenceId,
      timestamp,
      source: 'next.request',
      kind: 'exception',
      error,
      correlationId: digest,
      context: {
        path: safePath,
        method: request.method,
        routerKind: context.routerKind,
        routePath: context.routePath,
        routeType: context.routeType,
        renderSource: context.renderSource,
        revalidateReason: context.revalidateReason,
        digest,
      },
    });
  };
}

function getErrorDigest(error: unknown): string | undefined {
  if (!error || typeof error !== 'object' || !('digest' in error)) {
    return undefined;
  }
  return typeof error.digest === 'string' ? error.digest : undefined;
}

// 기존 하위 호환을 위한 레거시 헬퍼
import { normalizeError, globalResilioEmitter, ResilioError } from '@resiliojs/core';

export interface RouteErrorOptions {
  digest?: string;
}

/**
 * @deprecated Use createResilioOnRequestError instead.
 */
export function reportRouteError(
  error: unknown,
  options: RouteErrorOptions = {}
): ResilioError {
  const normalized = normalizeError(error, {
    defaultKind: 'server',
    defaultPresentation: 'boundary',
  });

  if (options.digest) {
    normalized.code = options.digest;
  }

  globalResilioEmitter.emit(normalized);

  return normalized;
}
