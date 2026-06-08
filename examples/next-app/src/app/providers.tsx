'use client';

import React from 'react';
import { ResilioProvider } from '@resilio/react';

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ResilioProvider
      onError={(error) => {
        console.error('[Example App error callback]:', error);
      }}
      onUserFacingError={(error) => {
        if (typeof window !== 'undefined') {
          alert(`[User Facing Error - Toast/Modal]\nKind: ${error.kind}\nMessage: ${error.message}`);
        }
      }}
    >
      {children}
    </ResilioProvider>
  );
}
