/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  ReviewRuleUpgradeResponseBody as GeneratedReviewRuleUpgradeResponseBody,
  RuleUpgradeInfoForReview as GeneratedRuleUpgradeInfoForReview,
} from './review_rule_upgrade_route.gen';
import type { PartialThreeWayRuleDiff } from '../model/diff/three_way_diff/three_way_rule_diff';

export { ReviewRuleUpgradeRequestBody } from './review_rule_upgrade_route.gen';
export type {
  ReviewRuleUpgradeRequestBodyInput,
  ReviewRuleUpgradeSort,
  ReviewRuleUpgradeSortItem,
  RuleUpgradeStatsForReview,
} from './review_rule_upgrade_route.gen';

<<<<<<< HEAD
// `RuleUpgradeInfoForReview` and `ReviewRuleUpgradeResponseBody` are intentionally not
// re-exported from the generated module: the OpenAPI schema represents `diff` as opaque,
// and we tighten it here with the precise `PartialThreeWayRuleDiff` union.
export type RuleUpgradeInfoForReview = Omit<GeneratedRuleUpgradeInfoForReview, 'diff'> & {
=======
export type ReviewRuleUpgradeRequestBody = z.infer<typeof ReviewRuleUpgradeRequestBody>;
export const ReviewRuleUpgradeRequestBody = z
  .object({
    filter: ReviewPrebuiltRuleUpgradeFilter.optional(),
    sort: ReviewRuleUpgradeSort.optional(),

    page: z.coerce.number().int().min(1).optional().default(1),
    /**
     * Rules per page
     */
    per_page: z.coerce.number().int().min(0).max(500).optional().default(20),
  })
  .nullable();

export interface ReviewRuleUpgradeResponseBody {
  /**
   * @deprecated Use the prebuilt rule status API instead. The field is kept
   * here for backward compatibility but can be removed after one Serverless
   * release.
   */
  stats: RuleUpgradeStatsForReview;

  /** Info about individual rules: one object per each rule available for upgrade */
  rules: RuleUpgradeInfoForReview[];

  /** The requested page number */
  page: number;

  /** The requested number of items per page */
  per_page: number;

  /** The total number of rules available for upgrade that match the filter criteria */
  total: number;
}

export interface RuleUpgradeStatsForReview {
  /**
   * @deprecated Always 0
   */
  num_rules_to_upgrade_total: number;

  /**
   * @deprecated Always 0
   */
  num_rules_with_conflicts: number;

  /**
   * @deprecated Always 0
   */
  num_rules_with_non_solvable_conflicts: number;

  /**
   * @deprecated Always an empty array
   */
  tags: RuleTagArray;
}

export interface RuleUpgradeInfoForReview {
  id: RuleObjectId;
  rule_id: RuleSignatureId;
  version: RuleVersion;
  current_rule: RuleResponse;
  target_rule: RuleResponse;
>>>>>>> 9.4
  diff: PartialThreeWayRuleDiff;
};

export type ReviewRuleUpgradeResponseBody = Omit<
  GeneratedReviewRuleUpgradeResponseBody,
  'rules'
> & {
  rules: RuleUpgradeInfoForReview[];
};
