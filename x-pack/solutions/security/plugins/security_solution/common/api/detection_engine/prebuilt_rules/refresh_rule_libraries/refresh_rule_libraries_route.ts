/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z, lazySchema, savedObjectId } from '@kbn/zod/v4';

const MAX_LIBRARY_IDS = 100;

export type RefreshRuleLibrariesRequestBody = z.infer<typeof RefreshRuleLibrariesRequestBody>;
export const RefreshRuleLibrariesRequestBody = lazySchema(() =>
  z
    .object({
      // Omit to refresh every library.
      library_ids: z.array(savedObjectId()).min(1).max(MAX_LIBRARY_IDS).optional(),
    })
    .nullable()
);

export interface RefreshRuleLibraryResult {
  id: string;
  outcome: 'refreshed' | 'up_to_date' | 'skipped' | 'failed';
  version?: string;
  item_count?: number;
  error?: string;
}

export interface RefreshRuleLibrariesResponseBody {
  results: RefreshRuleLibraryResult[];
}
