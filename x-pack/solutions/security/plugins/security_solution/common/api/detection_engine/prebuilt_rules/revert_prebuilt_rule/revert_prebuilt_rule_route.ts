/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod';
import { RuleResponse } from '../../model/rule_schema/rule_schemas.gen';
import { NormalizedRuleError } from '../../rule_management';

export type RevertPrebuiltRulesRequest = z.infer<typeof RevertPrebuiltRulesRequest>;
export const RevertPrebuiltRulesRequest = z.object({
  /** ID of rule to revert */
  id: z.string(),

  /** Revision of rule to guard against concurrence */
  revision: z.number(),

  /** Version of rule to guard against concurrence */
  version: z.number(),
});

export type BulkRevertSkipReason = z.infer<typeof BulkRevertSkipReason>;
export const BulkRevertSkipReason = z.enum(['RULE_NOT_PREBUILT', 'RULE_NOT_CUSTOMIZED']);
export type BulkRevertSkipReasonEnum = typeof BulkRevertSkipReason.enum;
export const BulkRevertSkipReasonEnum = BulkRevertSkipReason.enum;

export type BulkActionReversionSkipResult = z.infer<typeof BulkActionReversionSkipResult>;
export const BulkActionReversionSkipResult = z.object({
  id: z.string(),
  skip_reason: BulkRevertSkipReason,
});

export type RevertPrebuiltRulesResponseBody = z.infer<typeof RevertPrebuiltRulesResponseBody>;
export const RevertPrebuiltRulesResponseBody = z.object({
  success: z.boolean().optional(),
  status_code: z.number().int().optional(),
  message: z.string().optional(),
  rules_count: z.number().int().optional(),
  attributes: z.object({
    results: z.object({
      updated: z.array(RuleResponse), // An array of the rule objects reverted to their base version
      created: z.array(RuleResponse),
      deleted: z.array(RuleResponse),
      skipped: z.array(BulkActionReversionSkipResult), // An array of the rule ids and reasons that were skipped during reversion (due to being already non-customized)
    }),
    summary: z.object({
      failed: z.number().int(),
      skipped: z.number().int(),
      succeeded: z.number().int(),
      total: z.number().int(),
    }),
    errors: z.array(NormalizedRuleError).optional(), // An array of error objects, something containing the id of the rule causing the error and the reason behind it (e.g. no base version, rule is not a prebuilt Elastic rule)
  }),
});
