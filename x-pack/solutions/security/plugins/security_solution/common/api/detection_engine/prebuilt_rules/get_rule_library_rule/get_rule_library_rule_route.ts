/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z, lazySchema, savedObjectId } from '@kbn/zod/v4';
import type { RuleResponse } from '../../model/rule_schema';
import type { RuleLibraryRuleInstallState } from '../browse_rule_library/browse_rule_library_route';

const MAX_RULE_ID_LENGTH = 256;

export type GetRuleLibraryRuleRequestQuery = z.infer<typeof GetRuleLibraryRuleRequestQuery>;
export const GetRuleLibraryRuleRequestQuery = lazySchema(() =>
  z
    .object({
      library_id: savedObjectId(),
      rule_id: z.string().min(1).max(MAX_RULE_ID_LENGTH),
    })
    .strict()
);

export interface GetRuleLibraryRuleResponseBody {
  // The latest version of the rule in the library.
  rule: RuleResponse;
  install_state: RuleLibraryRuleInstallState;
  // Set when install_state is installed_from_other_library.
  installed_from_library?: { id: string; title: string };
}
