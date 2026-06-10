// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from 'vitest';
import React from 'react';
import { render, screen, cleanup } from '@testing-library/react';
import { ResilioProvider } from './ResilioProvider.js';
import { ResilioBoundary } from './ResilioBoundary.js';
import { defineErrorCatalog, PolicyEngine, defineErrorPolicy, ErrorSink } from '@resilio/core';

afterEach(() => {
  cleanup();
});

const testCatalog = defineErrorCatalog({});
const testPolicy = defineErrorPolicy(testCatalog, {});

function BuggyComponent({ shouldCrash }: { shouldCrash: boolean }) {
  if (shouldCrash) {
    throw new Error('Render-time crash!');
  }
  return <div data-testid="child">Working Normal</div>;
}

describe('ResilioBoundary', () => {
  it('should render children normally if there is no error', () => {
    render(
      <ResilioBoundary>
        <BuggyComponent shouldCrash={false} />
      </ResilioBoundary>
    );

    expect(screen.getByTestId('child').textContent).toBe('Working Normal');
  });

  it('should catch render errors and render fallback UI and report exception to engine sink', () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
    const onCatch = vi.fn();
    const sinkReport = vi.fn();
    
    const mockSink: ErrorSink<any> = {
      report: sinkReport,
    };
    
    const engine = new PolicyEngine({
      catalog: testCatalog,
      policy: testPolicy,
      sink: mockSink,
    });

    render(
      <ResilioProvider engine={engine}>
        <ResilioBoundary 
          fallback={({ error }) => <div data-testid="fallback">Error: {error.message}</div>}
          onCatch={onCatch}
        >
          <BuggyComponent shouldCrash={true} />
        </ResilioBoundary>
      </ResilioProvider>
    );

    expect(screen.getByTestId('fallback').textContent).toBe('Error: Render-time crash!');
    expect(onCatch).toHaveBeenCalledTimes(1);
    expect(sinkReport).toHaveBeenCalledTimes(1);
    expect(sinkReport.mock.calls[0][0]).toMatchObject({
      kind: 'exception',
      source: 'react.caught',
    });

    consoleError.mockRestore();
  });
});
