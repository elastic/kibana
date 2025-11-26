/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod';
import { SortOrder } from '../../model';
import type { RuleTagArray } from '../../model';
import type { RuleResponse } from '../../model/rule_schema';
import { FindRulesSortField } from '../../rule_management';
import { ReviewPrebuiltRuleInstallationFilter } from '../common/review_prebuilt_rules_installation_filter';

export type ReviewRuleInstallationSort = z.infer<typeof ReviewRuleInstallationSort>;
export const ReviewRuleInstallationSort = z.array(
  z.object({
    /**
     * Field to sort by
     */
    field: z.string().optional(), // TODO: Check if we want a narrower type?
    /**
     * Sort order
     */
    order: SortOrder.optional(),
  })
);

export type ReviewRuleInstallationRequestBody = z.infer<typeof ReviewRuleInstallationRequestBody>;
export const ReviewRuleInstallationRequestBody = z
  .object({
    filter: ReviewPrebuiltRuleInstallationFilter.optional(),
    sort: ReviewRuleInstallationSort.optional(),

    page: z.coerce.number().int().min(1).optional().default(1),
    /**
     * Rules per page
     */
    per_page: z.coerce.number().int().min(0).optional().default(20),
  })
  .nullable();

export interface ReviewRuleInstallationResponseBody {
  /** Aggregated info about all rules available for installation */
  stats: RuleInstallationStatsForReview;

  /** Info about individual rules: one object per each rule available for installation */
  rules: RuleResponse[];

  /** The total number of rules available for installation that match the filter criteria */
  total: number;
}

export interface RuleInstallationStatsForReview {
  /** Number of prebuilt rules available for installation (before applying filters) */
  num_rules_to_install: number;

  /** A union of all tags of all rules available for installation */
  tags: RuleTagArray;
}
