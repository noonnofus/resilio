'use client';

import { useContext } from 'react';
import { ResilioContext, ResilioContextValue } from './ResilioProvider.js';

export function useResilio(): ResilioContextValue {
  const context = useContext(ResilioContext);
  if (!context) {
    throw new Error(
      'useResilio must be used within a ResilioProvider. ' +
      'Please wrap your application root with <ResilioProvider>.'
    );
  }
  return context;
}

export function useReportError(): (error: unknown) => void {
  const { report } = useResilio();
  return report;
}
