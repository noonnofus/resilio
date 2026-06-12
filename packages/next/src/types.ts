import type { ErrorCatalog, ErrorCode, PublicErrorFor } from '@resiliojs/core';

export type { ErrorCode, PublicErrorFor };

export type PublicActionResult<
  TData,
  TCatalog extends ErrorCatalog,
  TCodes extends ErrorCode<TCatalog> = ErrorCode<TCatalog>,
> =
  | { ok: true; data: TData }
  | { ok: false; error: PublicErrorFor<TCatalog, TCodes> };
