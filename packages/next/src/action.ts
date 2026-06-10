import type { ErrorCatalog, ErrorCode } from '@resilio/core';
import { PublicActionResult } from './types.js';

/**
 * Next.js 제어 흐름 에러(redirect, notFound)인지 판별합니다.
 */
export function isNextRouterError(error: any): boolean {
  if (!error) return false;
  
  const digest = error.digest || error.message;
  if (typeof digest === 'string') {
    return (
      digest.startsWith('NEXT_REDIRECT') ||
      digest === 'NEXT_NOT_FOUND' ||
      digest.startsWith('NEXT_HTTP_ERROR_FALLBACK')
    );
  }
  
  const name = error.constructor?.name;
  if (name === 'RedirectError' || name === 'NotFoundError') {
    return true;
  }
  
  return false;
}

export interface ActionConfig {
  unexpectedPolicy?: 'throw' | 'safe';
}

/**
 * Server Action 래퍼 헬퍼.
 * expected error는 PublicActionResult로 반환하고, unexpected error는 그대로 throw합니다.
 * redirect/notFound 등 Next.js 제어 흐름 예외는 가로채지 않고 throw합니다.
 */
export function createResilioAction<
  TData,
  TCatalog extends ErrorCatalog,
  TCodes extends ErrorCode<TCatalog> = ErrorCode<TCatalog>,
>(
  handler: (...args: any[]) => Promise<PublicActionResult<TData, TCatalog, TCodes>>,
  config: ActionConfig = {}
): (...args: any[]) => Promise<PublicActionResult<TData, TCatalog, TCodes>> {
  const unexpectedPolicy = config.unexpectedPolicy ?? 'throw';

  return async (...args: any[]) => {
    try {
      return await handler(...args);
    } catch (error) {
      if (isNextRouterError(error)) {
        throw error;
      }
      
      if (unexpectedPolicy === 'throw') {
        throw error;
      }
      
      // unexpectedPolicy === 'safe' 일 때는 민감한 에러 스택을 누출하지 않고 generic error 반환
      return {
        ok: false,
        error: {
          code: 'INTERNAL_SERVER_ERROR',
          message: 'An unexpected server error occurred.',
        } as any,
      };
    }
  };
}
