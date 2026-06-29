/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';
import { BulkActionBase } from '../../../api/detection_engine/rule_management/bulk_actions/bulk_actions_route.gen';

/**
 * Selector for a set of rules used by enable / disable style bulk actions.
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
 * Common response summary returned by `_bulk_action` for enable / disable.
 *
 * No `success` field: the step throws on failure, so a returned value already
 * means the API call succeeded. Use the per-rule counters to branch.
 */
export const bulkRuleSummaryOutputSchema = z.object({
  succeeded: z.number().int().nonnegative(),
  failed: z.number().int().nonnegative(),
  skipped: z.number().int().nonnegative(),
  total: z.number().int().nonnegative(),
});

export type BulkRuleSelector = z.infer<typeof bulkRuleSelectorSchema>;
export type BulkRuleSummaryOutput = z.infer<typeof bulkRuleSummaryOutputSchema>;
