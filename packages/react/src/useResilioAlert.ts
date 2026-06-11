'use client';

import { useEffect } from 'react';
import { useReportError } from './useResilio.js';
import type { ErrorCatalog, PublicError, Result } from '@resilio/core';

/**
 * 서버 액션 등의 실행 결과(Result)를 받아 감시하고,
 * 에러 발생 시 자동으로 Resilio 전역 에러 리포터(report)를 호출하여 알림을 유도합니다.
 */
export function useResilioAlert<T extends ErrorCatalog>(
  state: Result<unknown, PublicError<T>> | null | undefined,
) {
  const report = useReportError();

  useEffect(() => {
    if (state && typeof state === 'object' && 'ok' in state && !state.ok && state.error) {
      report.public(state.error);
    }
  }, [state, report]);
}
