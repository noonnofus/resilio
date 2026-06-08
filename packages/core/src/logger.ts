import { ResilioError } from './error.js';

export interface LoggerAdapter {
  error(message: string, context?: Record<string, any>): void;
  warn(message: string, context?: Record<string, any>): void;
  info(message: string, context?: Record<string, any>): void;
}

export const defaultConsoleLogger: LoggerAdapter = {
  error(message, context) {
    console.error(`[Resilio Error] ${message}`, context || '');
  },
  warn(message, context) {
    console.warn(`[Resilio Warn] ${message}`, context || '');
  },
  info(message, context) {
    console.info(`[Resilio Info] ${message}`, context || '');
  },
};

export class ResilioLogger {
  private adapter: LoggerAdapter = defaultConsoleLogger;

  setAdapter(adapter: LoggerAdapter): void {
    this.adapter = adapter;
  }

  log(error: ResilioError, context?: Record<string, any>): void {
    const combinedContext = {
      kind: error.kind,
      code: error.code,
      fields: error.fields,
      retryable: error.retryable,
      presentation: error.presentation,
      ...context,
    };

    if (error.kind === 'server' || error.kind === 'unknown') {
      this.adapter.error(error.message, combinedContext);
    } else if (error.kind === 'network' || error.kind === 'rate_limit') {
      this.adapter.warn(error.message, combinedContext);
    } else {
      this.adapter.info(error.message, combinedContext);
    }
  }
}

export const resilioLogger = new ResilioLogger();
