'use client';

import { useActionState } from 'react';
import { useOptionalPresentError, useOptionalReportError } from '@resiliojs/react';
import { decodePublicError } from '@resiliojs/core';
import type {
  DecodeFailureReason,
  ErrorCatalog,
  PresentationContext,
  PublicError,
} from '@resiliojs/core';
import type { PublicActionResult } from '../types.js';

export interface UseResilioStateOptions<TData, TCatalog extends ErrorCatalog> {
  catalog: TCatalog;
  initialData?: TData | null;
  onSuccess?: (data: TData) => void;
  onError?: (error: PublicError<TCatalog>) => void;
  onInvalidPublicError?: (reason: DecodeFailureReason) => void;
  presentation?: Omit<PresentationContext, 'source'>;
}

export type ResilioActionState<TData, TCatalog extends ErrorCatalog> =
  PublicActionResult<TData | null, TCatalog>;

/**
 * Next.js Server Action의 에러 핸들링과 UI 바인딩을 자동화하는 React 19 훅입니다.
 * React 19 useActionState와 동일한 시그니처를 제공하면서, 실패 상태(ok === false) 리턴 시
 * 전역 ResilioProvider에 자동으로 예상 오류를 전달하고 UI 정책을 평가합니다.
 */
export function useResilioState<Payload, TData, TCatalog extends ErrorCatalog>(
  action: (
    state: ResilioActionState<TData, TCatalog>,
    payload: Payload,
  ) => Promise<ResilioActionState<TData, TCatalog>>,
  options: UseResilioStateOptions<TData, TCatalog>
) {
  const report = useOptionalReportError();
  const present = useOptionalPresentError();

  const initialState: ResilioActionState<TData, TCatalog> = {
    ok: true,
    data: options.initialData ?? null,
  };

  const [state, execute, isPending] = useActionState(async (
    prevState: ResilioActionState<TData, TCatalog>,
    payload: Payload,
  ): Promise<ResilioActionState<TData, TCatalog>> => {
    const res = await action(prevState, payload);
    
    if (res && typeof res === 'object' && 'ok' in res) {
      if (!res.ok && res.error) {
        const decoded = await decodePublicError(options.catalog, res.error);
        if (!decoded.ok) {
          report?.invalidPublic(decoded.reason, { source: 'next.action' });
          options.onInvalidPublicError?.(decoded.reason);
          return res;
        }

        report?.public(decoded.value, { source: 'next.action' });
        await present?.(decoded.value, {
          ...options.presentation,
          source: 'next.action',
        });
        options.onError?.(decoded.value);
      } else if (res.ok && res.data != null) {
        options.onSuccess?.(res.data);
      }
    }
    return res;
  }, initialState);

  return [state, execute, isPending] as const;
}
