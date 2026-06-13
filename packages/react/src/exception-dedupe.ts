const reportedErrors = new WeakSet<object>();

export function markExceptionReported(error: unknown): boolean {
  if ((typeof error !== 'object' && typeof error !== 'function') || error === null) {
    return true;
  }
  if (reportedErrors.has(error)) {
    return false;
  }
  reportedErrors.add(error);
  queueMicrotask(() => reportedErrors.delete(error));
  return true;
}
