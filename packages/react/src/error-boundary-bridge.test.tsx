// @vitest-environment jsdom
import { renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { defineErrorCatalog, defineErrorPolicy, PolicyEngine } from '@resiliojs/core';
import { ResilioProvider } from './ResilioProvider.js';
import { useResilioErrorBoundaryHandler } from './error-boundary-bridge.js';

describe('useResilioErrorBoundaryHandler', () => {
  it('reports boundary errors with react.caught ownership', async () => {
    const catalog = defineErrorCatalog({ TEST: {} });
    const sink = { report: vi.fn() };
    const engine = new PolicyEngine({
      catalog,
      policy: defineErrorPolicy(catalog, {
        TEST: { feedback: 'silent', message: 'test' },
      }),
      sink,
    });
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <ResilioProvider engine={engine}>{children}</ResilioProvider>
    );
    const { result } = renderHook(() => useResilioErrorBoundaryHandler({ boundary: 'profile' }), {
      wrapper,
    });

    result.current(new Error('render failed'), { componentStack: 'Profile' });
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(sink.report).toHaveBeenCalledWith(expect.objectContaining({
      source: 'react.caught',
      kind: 'exception',
      context: {
        componentStack: 'Profile',
        boundary: 'profile',
      },
    }));
  });
});
