/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';
import type { RuleObjectId, RuleSignatureId, RuleTagArray } from '../../model';
import { SortOrder } from '../../model';
import type { PartialThreeWayRuleDiff } from '../model';
import type { RuleResponse, RuleVersion } from '../../model/rule_schema';
import { FindRulesSortField } from '../../rule_management';
import type { FacetCounts } from '../../rule_management/granular_rules_contract.gen';
import {
  GranularRulesSearch,
  SearchRulesAggregations,
} from '../../rule_management/granular_rules_contract.gen';
import { SearchRulesSearchAfterItem } from '../../rule_management/search_rules/search_rules_route.gen';

export type ReviewRuleUpgradeRequestBody = z.infer<typeof ReviewRuleUpgradeRequestBody>;
export const ReviewRuleUpgradeRequestBody = z.object({
  /**
   * Page number starting from 1. Ignored when `search_after` is provided.
   */
  page: z.number().int().min(1).default(1),
  /**
   * Rules per page
   */
  per_page: z.number().int().min(1).max(10_000).default(20),

  /**
   * KQL filter string applied to installed prebuilt rules. Must use the
   * native `alert.attributes.*` field namespace (same as the `_search`
   * endpoint).
   */
  filter: z.string().optional(),

  /**
   * Free-text search combined with the KQL `filter`.
   */
  search: GranularRulesSearch.optional(),

  /**
   * Aggregation options (facet counts) computed over the filtered set of
   * upgradeable installed rules.
   */
  aggregations: SearchRulesAggregations.optional(),

  /**
   * Field to sort by.
   */
  sort_field: FindRulesSortField.optional(),

  /**
   * Sort order. Required when `sort_field` is set.
   */
  sort_order: SortOrder.optional(),

  /**
   * Elasticsearch-style `search_after` tiebreaker values. Requires
   * `sort_field` and `sort_order`. When set, `page` is ignored.
   */
  search_after: z.array(SearchRulesSearchAfterItem).min(1).optional(),

  /**
   * Restrict the review to installed rules with these SO ids. Useful for
   * checking whether a single rule has an upgrade available (e.g. the
   * in-app update callout).
   */
  rule_ids: z.array(z.string()).min(1).optional(),
});
export type ReviewRuleUpgradeRequestBodyInput = z.input<typeof ReviewRuleUpgradeRequestBody>;

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

  /**
   * Facet counts per category requested in `aggregations.counts`.
   */
  counts?: FacetCounts;

  /**
   * Sort values of the last hit on this page, for use as `search_after` on
   * the next request. Only included when the request used `search_after` or
   * when deep pagination applies.
   */
  search_after?: Array<string | number | boolean | null>;
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
  diff: PartialThreeWayRuleDiff;
  revision: number;
  has_base_version: boolean;
}
