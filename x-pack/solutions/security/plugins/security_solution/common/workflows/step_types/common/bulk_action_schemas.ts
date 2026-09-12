/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';
import {
  BulkActionBase,
  NormalizedRuleError,
} from '../../../api/detection_engine/rule_management/bulk_actions/bulk_actions_route.gen';

/**
 * Selector for a set of rules targeted by a bulk action.
 *
 * Re-uses the `ids` / `query` shapes from the API's `BulkActionBase`.
 *
 * Trade-off: the "exactly one of" rule is a `.refine()`, which is stripped
 * before Monaco JSON Schema generation — so it surfaces at workflow
 * validation time, not in the YAML editor. Expressing it as a union of two
 * strict objects would reach the editor as `anyOf`, but unions in step input
 * schemas currently break workflow validation for template-string inputs
 * (see the workflows-eng bug linked in PR #275187 review).
 */
export const bulkRuleSelectorSchema = BulkActionBase.pick({
  ids: true,
  query: true,
})
  .extend({
    // An empty `query` would select every rule; `.min(1)` (unlike a refine)
    // also reaches the JSON Schema as `minLength`, so the editor flags it.
    query: z.string().min(1, 'query cannot be an empty string').optional(),
  })
  .refine((value) => (value.ids === undefined) !== (value.query === undefined), {
    message: 'Provide exactly one of `ids` or `query`',
    path: ['ids'],
  });

/**
 * Summary of a `_bulk_action` result: per-rule counters plus the `errors` for
 * any rules that failed.
 */
export const bulkRuleSummaryOutputSchema = z.object({
  succeeded: z.number().int().nonnegative(),
  failed: z.number().int().nonnegative(),
  skipped: z.number().int().nonnegative(),
  total: z.number().int().nonnegative(),
  errors: z.array(NormalizedRuleError).optional(),
});

export type BulkRuleSelector = z.infer<typeof bulkRuleSelectorSchema>;
export type BulkRuleSummaryOutput = z.infer<typeof bulkRuleSummaryOutputSchema>;
