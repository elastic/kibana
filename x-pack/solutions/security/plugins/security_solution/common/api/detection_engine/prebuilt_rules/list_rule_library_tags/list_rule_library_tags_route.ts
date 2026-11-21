/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z, lazySchema, savedObjectId } from '@kbn/zod/v4';

export type ListRuleLibraryTagsRequestQuery = z.infer<typeof ListRuleLibraryTagsRequestQuery>;
export const ListRuleLibraryTagsRequestQuery = lazySchema(() =>
  z
    .object({
      // Omit to list the tags of every library.
      library_id: savedObjectId().optional(),
    })
    .strict()
);

export interface ListRuleLibraryTagsResponseBody {
  tags: string[];
}
