/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod';
import { SortOrder, type RuleObjectId, type RuleSignatureId, type RuleTagArray } from '../../model';
import type { PartialRuleDiff } from '../model';
import type { RuleResponse, RuleVersion } from '../../model/rule_schema';
import { FindRulesSortField } from '../../rule_management';

export type ReviewRuleUpgradeRequestBody = z.infer<typeof ReviewRuleUpgradeRequestBody>;
export const ReviewRuleUpgradeRequestBody = z
  .object({
    /**
     * Rule IDs to return upgrade info for
     */
    rule_ids: z.array(z.string()).optional(),
    /**
     * Search query
     */
    filter: z.string().optional(),
    /**
     * Field to sort by
     */
    sort_field: FindRulesSortField.optional(),
    /**
     * Sort order
     */
    sort_order: SortOrder.optional(),
    /**
     * Page number
     */
    page: z.coerce.number().int().min(1).optional().default(1),
    /**
     * Rules per page
     */
    per_page: z.coerce.number().int().min(0).optional().default(20),
  })
  .nullable();

export interface ReviewRuleUpgradeResponseBody {
  /** Aggregated info about all rules available for upgrade */
  stats: RuleUpgradeStatsForReview;

  /** Info about individual rules: one object per each rule available for upgrade */
  rules: RuleUpgradeInfoForReview[];

  /** The requested page number */
  page: number;

  /** The requested number of items per page */
  per_page: number;
}

export interface RuleUpgradeStatsForReview {
  /** Number of installed prebuilt rules available for upgrade (stock + customized) */
  num_rules_to_upgrade_total: number;

  /**
   * @deprecated Always 0
   */
  num_rules_with_conflicts: number;

  /**
   * @deprecated Always 0
   */
  num_rules_with_non_solvable_conflicts: number;

  /** A union of all tags of all rules available for upgrade */
  tags: RuleTagArray;
}

export interface RuleUpgradeInfoForReview {
  id: RuleObjectId;
  rule_id: RuleSignatureId;
  version: RuleVersion;
  current_rule: RuleResponse;
  target_rule: RuleResponse;
  diff: PartialRuleDiff;
  revision: number;
}
