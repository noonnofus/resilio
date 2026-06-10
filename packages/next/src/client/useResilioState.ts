'use client';

import { useActionState } from 'react';
import { useReportError } from '@resilio/react';
import type { ErrorCatalog, PublicError } from '@resilio/core';
import type { PublicActionResult } from '../types.js';

export interface UseResilioStateOptions<TData, E> {
  initialData?: TData | null;
  onSuccess?: (data: TData) => void;
  onError?: (error: E) => void;
}

/**
 * Next.js Server Action의 에러 핸들링과 UI 바인딩을 자동화하는 React 19 훅입니다.
 * React 19 useActionState와 동일한 시그니처를 제공하면서, 실패 상태(ok === false) 리턴 시
 * 전역 ResilioProvider에 자동으로 에러를 전달(report.public)합니다.
 */
export function useResilioState<State, Payload, TData, TCatalog extends ErrorCatalog>(
  action: (state: State, payload: Payload) => Promise<PublicActionResult<TData, TCatalog> | State>,
  options: UseResilioStateOptions<TData, PublicError<TCatalog>> = {}
) {
  const report = useReportError();
  
  const initialState = { ok: true, data: options.initialData ?? null } as any;

  const [state, execute, isPending] = useActionState(async (prevState: any, payload: Payload) => {
    const res = await action(prevState, payload);
    
    if (res && typeof res === 'object' && 'ok' in res) {
      if (!res.ok && res.error) {
        report.public(res.error, { source: 'next.action' });
        
        if (options.onError) {
          try {
            options.onError(res.error);
          } catch (e) {
            console.error('Error in useResilioState onError callback:', e);
          }
        }
      } else if (res.ok && res.data !== undefined) {
        if (options.onSuccess) {
          try {
            options.onSuccess(res.data);
          } catch (e) {
            console.error('Error in useResilioState onSuccess callback:', e);
          }
        }
      }
    }
    return res;
  }, initialState);

  return [state, execute, isPending] as const;
}
