'use client';

import { useMemo, type ReactNode } from 'react';
import { PolicyEngine, ResilioProvider } from '@resilio/next/client';
import { appCatalog, appPolicy } from './catalog';

export function Providers({ children }: { children: ReactNode }) {
  const engine = useMemo(
    () => new PolicyEngine({ catalog: appCatalog, policy: appPolicy }),
    [],
  );

  return <ResilioProvider engine={engine}>{children}</ResilioProvider>;
}
