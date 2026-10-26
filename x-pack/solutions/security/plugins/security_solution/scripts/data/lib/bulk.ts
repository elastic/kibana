/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ToolingLog } from '@kbn/tooling-log';
import { isRecord } from './type_guards';

interface BulkResponseLike {
  errors?: boolean;
  items?: Array<Record<string, unknown>>;
}

export const assertNoBulkErrors = (index: string, resp: BulkResponseLike, log: ToolingLog) => {
  if (!resp.errors) return;

  const firstError = resp.items?.find((it) => {
    if (!isRecord(it)) return false;
    const action = it.index ?? it.create ?? it.update ?? it.delete;
    return isRecord(action) && 'error' in action;
  });

  log.error(`Bulk indexing into ${index} had errors. First error: ${JSON.stringify(firstError)}`);
  throw new Error(`Bulk indexing errors for ${index}`);
};
