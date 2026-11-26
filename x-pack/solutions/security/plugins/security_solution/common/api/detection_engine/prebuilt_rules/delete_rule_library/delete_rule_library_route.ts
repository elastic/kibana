/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z, lazySchema } from '@kbn/zod/v4';
import { BooleanFromString } from '@kbn/zod-helpers/v4';

export type DeleteRuleLibraryRequestParams = z.infer<typeof DeleteRuleLibraryRequestParams>;
export const DeleteRuleLibraryRequestParams = lazySchema(() =>
  z.object({ library_id: z.string().min(1).max(128) }).strict()
);

export type DeleteRuleLibraryRequestQuery = z.infer<typeof DeleteRuleLibraryRequestQuery>;
export const DeleteRuleLibraryRequestQuery = lazySchema(() =>
  z
    .object({
      // Keeps the rule assets of the library, which installed rules need as their base version.
      keep_rule_versions: BooleanFromString.optional().default(false),
    })
    .strict()
);

export interface DeleteRuleLibraryResponseBody {
  id: string;
  // Rule assets that were removed together with the library.
  deleted_assets: number;
}
