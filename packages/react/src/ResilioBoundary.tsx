'use client';

import React from 'react';
import { ResilioError, normalizeError } from '@resilio/core';
import { ResilioContext } from './ResilioProvider.js';

interface ResilioBoundaryInnerProps {
  children: React.ReactNode;
  fallback?: React.ReactNode | ((props: { error: ResilioError; reset: () => void }) => React.ReactNode);
  report: (error: unknown) => void;
  onCatch?: (error: ResilioError, errorInfo: React.ErrorInfo) => void;
}

interface ResilioBoundaryInnerState {
  hasError: boolean;
  error: ResilioError | null;
}

class ResilioBoundaryInner extends React.Component<
  ResilioBoundaryInnerProps,
  ResilioBoundaryInnerState
> {
  constructor(props: ResilioBoundaryInnerProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: unknown): ResilioBoundaryInnerState {
    return {
      hasError: true,
      error: normalizeError(error, { defaultPresentation: 'boundary' }),
    };
  }

  componentDidCatch(error: unknown, errorInfo: React.ErrorInfo) {
    const normalized = normalizeError(error, { defaultPresentation: 'boundary' });
    
    if (this.props.onCatch) {
      try {
        this.props.onCatch(normalized, errorInfo);
      } catch (e) {
        console.error('Error in ResilioBoundary onCatch callback:', e);
      }
    }

    try {
      this.props.report(normalized);
    } catch (e) {
      console.error('Failed to report boundary error to Resilio Context:', e);
    }
  }

  reset = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError && this.state.error) {
      const { fallback } = this.props;

      if (typeof fallback === 'function') {
        return fallback({ error: this.state.error, reset: this.reset });
      }

      if (fallback) {
        return fallback;
      }

      return (
        <div style={{ padding: '20px', border: '1px solid #ffcccc', borderRadius: '4px', backgroundColor: '#fff5f5', color: '#cc0000' }}>
          <h2>Something went wrong.</h2>
          <p>{this.state.error.message}</p>
          <button 
            onClick={this.reset}
            style={{ padding: '8px 16px', background: '#cc0000', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
          >
            Try again
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

export interface ResilioBoundaryProps {
  children: React.ReactNode;
  fallback?: React.ReactNode | ((props: { error: ResilioError; reset: () => void }) => React.ReactNode);
  onCatch?: (error: ResilioError, errorInfo: React.ErrorInfo) => void;
}

export function ResilioBoundary({ children, fallback, onCatch }: ResilioBoundaryProps) {
  return (
    <ResilioContext.Consumer>
      {(context) => {
        const report = context ? context.report : (error: unknown) => {
          console.warn('ResilioBoundary was used without ResilioProvider. Error reported to fallback logger.', error);
        };
        return (
          <ResilioBoundaryInner fallback={fallback} report={report} onCatch={onCatch}>
            {children}
          </ResilioBoundaryInner>
        );
      }}
    </ResilioContext.Consumer>
  );
}
