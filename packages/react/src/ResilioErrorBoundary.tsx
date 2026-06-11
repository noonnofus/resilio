'use client';

import React, { Component, useContext } from 'react';
import { ResilioContext } from './ResilioProvider.js';
import { markExceptionReported } from './exception-dedupe.js';

export interface ResilioErrorFallbackProps {
  error: Error;
  reset(): void;
  resetBlocked: boolean;
}

export interface ResilioErrorBoundaryProps {
  children: React.ReactNode;
  fallback: React.ReactNode | ((props: ResilioErrorFallbackProps) => React.ReactNode);
  finalFallback?: React.ReactNode | ((props: ResilioErrorFallbackProps) => React.ReactNode);
  onError?: (error: Error, info: React.ErrorInfo) => void;
  maxResets?: number;
  resetWindowMs?: number;
}

interface BoundaryState {
  error: Error | null;
  resetBlocked: boolean;
}

interface InternalBoundaryProps extends ResilioErrorBoundaryProps {
  report(error: Error, info: React.ErrorInfo): void;
}

class InternalResilioErrorBoundary extends Component<InternalBoundaryProps, BoundaryState> {
  state: BoundaryState = { error: null, resetBlocked: false };
  private resetTimestamps: number[] = [];

  static getDerivedStateFromError(error: Error): BoundaryState {
    return { error, resetBlocked: false };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    this.props.report(error, info);
  }

  private reset = () => {
    const now = Date.now();
    const windowMs = this.props.resetWindowMs ?? 1_000;
    const maxResets = this.props.maxResets ?? 3;
    this.resetTimestamps = this.resetTimestamps.filter((timestamp) => now - timestamp < windowMs);
    if (this.resetTimestamps.length >= maxResets) {
      this.setState({ resetBlocked: true });
      return;
    }
    this.resetTimestamps.push(now);
    this.setState({ error: null, resetBlocked: false });
  };

  render() {
    const { error, resetBlocked } = this.state;
    if (!error) {
      return this.props.children;
    }
    const input = { error, reset: this.reset, resetBlocked };
    const selectedFallback = resetBlocked && this.props.finalFallback
      ? this.props.finalFallback
      : this.props.fallback;
    return typeof selectedFallback === 'function' ? selectedFallback(input) : selectedFallback;
  }
}

export function ResilioErrorBoundary(props: ResilioErrorBoundaryProps) {
  const context = useContext(ResilioContext);
  const report = (error: Error, info: React.ErrorInfo) => {
    if (markExceptionReported(error)) {
      context?.engine?.reportException(
        error,
        { componentStack: info.componentStack },
        'react.caught',
      );
    }
    props.onError?.(error, info);
  };

  return <InternalResilioErrorBoundary {...props} report={report} />;
}
