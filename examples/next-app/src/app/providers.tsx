'use client';

import { useMemo, type ReactNode } from 'react';
import { MutationCache, QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createResilioMutationCacheCallbacks } from '@resilio/tanstack/query';
import {
  PolicyEngine,
  ResilioErrorBoundary,
  ResilioPresentationHost,
  ResilioProvider,
  createPresentationEvaluator,
  usePresentError,
} from '@resilio/next/client';
import { appCatalog, appPolicy, appPresentationPolicy } from './catalog';

export function Providers({ children }: { children: ReactNode }) {
  const engine = useMemo(
    () => new PolicyEngine({ catalog: appCatalog, policy: appPolicy }),
    [],
  );
  const evaluator = useMemo(
    () => createPresentationEvaluator({
      catalog: appCatalog,
      policy: appPresentationPolicy,
      fallback: () => ({
        channel: 'banner',
        severity: 'error',
        messageKey: '요청을 처리하지 못했습니다.',
      }),
    }),
    [],
  );

  return (
    <ResilioProvider engine={engine} evaluator={evaluator}>
      <TanStackLayer>
        <ResilioErrorBoundary
          fallback={({ reset }) => <button onClick={reset}>화면 다시 시도</button>}
          finalFallback={<p role="alert">반복 오류가 발생해 복구를 중단했습니다.</p>}
        >
          {children}
        </ResilioErrorBoundary>
        <ResilioPresentationHost>
          {({ active, dismiss }) => (
            <>
              {active.filter(({ decision }) => decision.channel === 'modal').map((presentation) => (
                <section
                  key={presentation.id}
                  role="dialog"
                  aria-modal="true"
                  aria-label="Resilio custom modal"
                >
                  <p>{presentation.decision.messageKey}</p>
                  <button onClick={() => dismiss(presentation.id)} type="button">닫기</button>
                </section>
              ))}
              {active.filter(({ decision }) => decision.channel === 'banner').map((presentation) => (
                <p key={presentation.id} role="alert">{presentation.decision.messageKey}</p>
              ))}
            </>
          )}
        </ResilioPresentationHost>
      </TanStackLayer>
    </ResilioProvider>
  );
}

function TanStackLayer({ children }: { children: ReactNode }) {
  const present = usePresentError();
  const queryClient = useMemo(
    () => new QueryClient({
      mutationCache: new MutationCache(createResilioMutationCacheCallbacks({ present })),
    }),
    [present],
  );

  return (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
}
