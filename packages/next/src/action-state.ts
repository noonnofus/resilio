import { Result } from '@resilio/core';

/**
 * React 19 useActionState 초기화 시그니처에 적합한 성공 상태(Result)의 액션 초기값을 생성합니다.
 */
export function toActionState<T, E = unknown>(
  initialData: T | null = null
): Result<T | null, E> {
  return { ok: true, data: initialData };
}
