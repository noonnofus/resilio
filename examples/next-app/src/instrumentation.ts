import { createConsoleSink } from '@resilio/next';
import { createResilioOnRequestError } from '@resilio/next';

export const onRequestError = createResilioOnRequestError(createConsoleSink());
