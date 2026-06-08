export type ResilioErrorKind =
  | 'validation'
  | 'authorization'
  | 'network'
  | 'rate_limit'
  | 'server'
  | 'unknown';

export interface ResilioError {
  kind: ResilioErrorKind;
  message: string;
  code?: string;
  fields?: Record<string, string[]>;
  retryable?: boolean;
  presentation?: 'inline' | 'toast' | 'modal' | 'boundary';
}

export function isResilioError(value: any): value is ResilioError {
  return (
    value !== null &&
    typeof value === 'object' &&
    typeof value.message === 'string' &&
    (value.kind === 'validation' ||
      value.kind === 'authorization' ||
      value.kind === 'network' ||
      value.kind === 'rate_limit' ||
      value.kind === 'server' ||
      value.kind === 'unknown')
  );
}
