import type { ErrorCatalog, ErrorCode } from '@resiliojs/core';
import type { PublicActionResult } from './types.js';

/**
 * @deprecated Server Action 전체를 감싸는 래핑 방식은 권장되지 않습니다.
 * 대신 개별 Action에서 직접 `PublicActionResult`를 반환하십시오.
 * 이 호환 helper는 예외를 가로채지 않으며 unexpected exception과 Next.js 제어 흐름을 그대로 전파합니다.
 */
export function createResilioAction<
  TData,
  TCatalog extends ErrorCatalog,
  TCodes extends ErrorCode<TCatalog> = ErrorCode<TCatalog>,
  TArgs extends unknown[] = unknown[],
>(
  handler: (...args: TArgs) => Promise<PublicActionResult<TData, TCatalog, TCodes>>,
): (...args: TArgs) => Promise<PublicActionResult<TData, TCatalog, TCodes>> {
  return handler;
}

/**
 * 이미 decode된 Server Action 결과가 성공인지 타입 안전하게 확인합니다.
 */
export function isSuccessfulResilioAction<
  TData,
  TCatalog extends ErrorCatalog,
  TCodes extends ErrorCode<TCatalog> = ErrorCode<TCatalog>,
>(
  result: PublicActionResult<TData, TCatalog, TCodes>
): result is { ok: true; data: TData } {
  return result.ok === true;
}
