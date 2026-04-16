/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';
import type { RuleTagArray } from '../../model';
import { SortOrder } from '../../model';
import type { RuleResponse } from '../../model/rule_schema';
import type { WarningSchema } from '../../model/warning_schema.gen';
import type { FacetCounts } from '../../rule_management/granular_rules_contract.gen';
import { GranularRulesSearch } from '../../rule_management/granular_rules_contract.gen';
import { SearchRulesSearchAfterItem } from '../../rule_management/search_rules/search_rules_route.gen';
import { PrebuiltRuleAssetsAggregations } from '../common/prebuilt_rule_assets_aggregations';
import { PrebuiltRuleAssetsSortField } from '../common/prebuilt_rule_assets_sort';

export type ReviewRuleInstallationRequestBody = z.infer<typeof ReviewRuleInstallationRequestBody>;
export const ReviewRuleInstallationRequestBody = z.object({
  /**
   * Page number starting from 1. Ignored when `search_after` is provided.
   */
  page: z.number().int().min(1).default(1),
  /**
   * Rules per page
   */
  per_page: z.number().int().min(1).max(10_000).default(20),

  /**
   * KQL filter string applied to prebuilt rule assets. Must use the native
   * `security-rule.attributes.*` field namespace.
   */
  filter: z.string().optional(),

  /**
   * Free-text search combined with the KQL `filter`.
   */
  search: GranularRulesSearch.optional(),

  /**
   * Aggregation options (facet counts) computed over the filtered set of
   * installable rules.
   */
  aggregations: PrebuiltRuleAssetsAggregations.optional(),

  /**
   * Field to sort by.
   */
  sort_field: PrebuiltRuleAssetsSortField.optional(),

  /**
   * Sort order. Required when `sort_field` is set.
   */
  sort_order: SortOrder.optional(),

  /**
   * Elasticsearch-style `search_after` tiebreaker values. Requires
   * `sort_field` and `sort_order`. When set, `page` is ignored.
   */
  search_after: z.array(SearchRulesSearchAfterItem).min(1).optional(),
});
export type ReviewRuleInstallationRequestBodyInput = z.input<
  typeof ReviewRuleInstallationRequestBody
>;

export interface ReviewRuleInstallationResponseBody {
  /** Current page number */
  page: number;

  /** Rules per page */
  per_page: number;

  /** Aggregated info about all rules available for installation */
  stats: RuleInstallationStatsForReview;

  /** Info about individual rules: one object per each rule available for installation */
  rules: RuleResponse[];

  /** The total number of rules available for installation that match the filter criteria */
  total: number;

  /**
   * Facet counts per category requested in `aggregations.counts`.
   */
  counts?: FacetCounts;

  /**
   * Sort values of the last hit on this page, for use as `search_after` on the
   * next request. Only included when the request used `search_after` or when
   * deep pagination applies.
   */
  search_after?: Array<string | number | boolean | null>;

  /** Warnings produced while serving the request. */
  warnings?: WarningSchema[];
}

export interface RuleInstallationStatsForReview {
  /** Number of prebuilt rules available for installation (before applying filters) */
  num_rules_to_install: number;

  /** A union of all tags of all rules available for installation */
  tags: RuleTagArray;
}
