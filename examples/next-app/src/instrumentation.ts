import { createConsoleSink } from '@resiliojs/next';
import { createResilioOnRequestError } from '@resiliojs/next';

export const onRequestError = createResilioOnRequestError(createConsoleSink());
