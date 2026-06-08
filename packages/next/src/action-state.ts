import { ActionResult } from './action.js';

export function toActionState<T, E = any>(
  initialData: T | null = null
): ActionResult<T | null, E> {
  return { ok: true, data: initialData };
}
