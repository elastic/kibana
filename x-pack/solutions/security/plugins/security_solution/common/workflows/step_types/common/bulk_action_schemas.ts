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
 * Re-uses the `ids` / `query` shapes from the API's `BulkActionBase`. The
 * "exactly one of" rule is documented but NOT enforced by the generated zod
 * schema (the route validates it at runtime); the `.refine()` below promotes
 * that check to workflow YAML edit time.
 */
export const bulkRuleSelectorSchema = BulkActionBase.pick({
  ids: true,
  query: true,
}).refine((value) => (value.ids === undefined) !== (value.query === undefined), {
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
