import { ResilioError } from './error.js';

export type ResilioListener = (error: ResilioError) => void;

export class ResilioEmitter {
  private listeners: Set<ResilioListener> = new Set();
  private buffer: ResilioError[] = [];

  subscribe(listener: ResilioListener): () => void {
    this.listeners.add(listener);
    
    if (this.buffer.length > 0) {
      const toFlush = [...this.buffer];
      this.buffer = [];
      for (const error of toFlush) {
        try {
          listener(error);
        } catch (e) {
          console.error('Error in flushing Resilio listener:', e);
        }
      }
    }

    return () => {
      this.listeners.delete(listener);
    };
  }

  emit(error: ResilioError): void {
    if (this.listeners.size === 0) {
      this.buffer.push(error);
      return;
    }

    for (const listener of this.listeners) {
      try {
        listener(error);
      } catch (e) {
        console.error('Error in Resilio listener:', e);
      }
    }
  }

  clear(): void {
    this.listeners.clear();
    this.buffer = [];
  }
}

export const globalResilioEmitter = new ResilioEmitter();
