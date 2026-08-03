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

// `RuleUpgradeInfoForReview` and `ReviewRuleUpgradeResponseBody` are intentionally not
// re-exported from the generated module: the OpenAPI schema represents `diff` as opaque,
// and we tighten it here with the precise `PartialThreeWayRuleDiff` union.
export type RuleUpgradeInfoForReview = Omit<GeneratedRuleUpgradeInfoForReview, 'diff'> & {
  diff: PartialThreeWayRuleDiff;
};

export type ReviewRuleUpgradeResponseBody = Omit<
  GeneratedReviewRuleUpgradeResponseBody,
  'rules'
> & {
  rules: RuleUpgradeInfoForReview[];
};
