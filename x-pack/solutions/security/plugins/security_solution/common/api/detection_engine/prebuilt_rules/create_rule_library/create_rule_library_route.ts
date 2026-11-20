/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z, lazySchema } from '@kbn/zod/v4';
import {
  refineRuleLibraryConnection,
  ruleLibraryConnectionFields,
} from '../rule_library_connection/rule_library_connection';

export type CreateRuleLibraryRequestBody = z.infer<typeof CreateRuleLibraryRequestBody>;
export const CreateRuleLibraryRequestBody = lazySchema(() =>
  z
    .object({
      ...ruleLibraryConnectionFields,
      // Shared libraries are visible in every space. A space library belongs to the current space.
      scope: z.enum(['shared', 'space']),
    })
    .strict()
    .superRefine(refineRuleLibraryConnection)
);

export interface CreateRuleLibraryResponseBody {
  id: string;
}
