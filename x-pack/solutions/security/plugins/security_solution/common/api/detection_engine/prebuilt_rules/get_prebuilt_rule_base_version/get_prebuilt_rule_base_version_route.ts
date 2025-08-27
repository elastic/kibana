/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod';
import type { RuleResponse } from '../../model/rule_schema/rule_schemas.gen';
import type { PartialRuleDiff } from '../model';

export type GetPrebuiltRuleBaseVersionRequest = z.infer<typeof GetPrebuiltRuleBaseVersionRequest>;
export const GetPrebuiltRuleBaseVersionRequest = z.object({
  id: z.string(),
});

export interface GetPrebuiltRuleBaseVersionResponseBody {
  /** The base version of the rule */
  base_version: RuleResponse;

  /** The current version of the rule */
  current_version: RuleResponse;

  /** The resulting diff between the base and current versions of the rule */
  diff: PartialRuleDiff;
}
