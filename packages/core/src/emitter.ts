import { ResilioError } from './error.js';

export type ResilioListener = (error: ResilioError) => void;

export class ResilioEmitter {
  private listeners: Set<ResilioListener> = new Set();

  subscribe(listener: ResilioListener): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  emit(error: ResilioError): void {
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
  }
}

export const globalResilioEmitter = new ResilioEmitter();
