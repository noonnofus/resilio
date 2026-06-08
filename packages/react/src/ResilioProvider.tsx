'use client';

import React, { createContext, useEffect, useMemo, useRef } from 'react';
import { ResilioError, ResilioEmitter, normalizeError, resilioLogger } from '@resilio/core';

export interface ResilioContextValue {
  report: (error: unknown) => void;
  emitter: ResilioEmitter;
}

export const ResilioContext = createContext<ResilioContextValue | null>(null);

export interface ResilioProviderProps {
  children: React.ReactNode;
  onError?: (error: ResilioError) => void;
  onUserFacingError?: (error: ResilioError) => void;
  logErrors?: boolean;
}

export function ResilioProvider({
  children,
  onError,
  onUserFacingError,
  logErrors = true,
}: ResilioProviderProps) {
  const emitterRef = useRef<ResilioEmitter | null>(null);
  if (!emitterRef.current) {
    emitterRef.current = new ResilioEmitter();
  }
  const emitter = emitterRef.current;

  const callbacksRef = useRef({ onError, onUserFacingError, logErrors });
  useEffect(() => {
    callbacksRef.current = { onError, onUserFacingError, logErrors };
  }, [onError, onUserFacingError, logErrors]);

  useEffect(() => {
    const unsubscribe = emitter.subscribe((error) => {
      const { onError, onUserFacingError, logErrors } = callbacksRef.current;

      if (logErrors) {
        resilioLogger.log(error);
      }

      if (onError) {
        try {
          onError(error);
        } catch (e) {
          console.error('Error in ResilioProvider onError callback:', e);
        }
      }

      if (onUserFacingError && (error.presentation === 'toast' || error.presentation === 'modal')) {
        try {
          onUserFacingError(error);
        } catch (e) {
          console.error('Error in ResilioProvider onUserFacingError callback:', e);
        }
      }
    });

    return () => {
      unsubscribe();
    };
  }, [emitter]);

  const report = useMemo(() => {
    return (error: unknown) => {
      const normalized = normalizeError(error);
      emitter.emit(normalized);
    };
  }, [emitter]);

  const contextValue = useMemo(() => ({
    report,
    emitter,
  }), [report, emitter]);

  return (
    <ResilioContext.Provider value={contextValue}>
      {children}
    </ResilioContext.Provider>
  );
}
