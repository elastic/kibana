/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';
import type { FacetCounts } from '../../rule_management/granular_rules_contract.gen';
import {
  MAX_FIND_RULES_WITH_FACETS_FILTER_KQL_LENGTH,
  MAX_FIND_RULES_WITH_FACETS_SEARCH_TERM_LENGTH,
} from '../../rule_management/find_rules_with_facets/find_rules_with_facets_limits';

export type PrebuiltReviewInstallFacetCategory = z.infer<typeof PrebuiltReviewInstallFacetCategory>;
export const PrebuiltReviewInstallFacetCategory = z.enum([
  'tags',
  'severity',
  'risk_score',
  'name',
  'type',
]);

export type PrebuiltReviewUpgradeFacetCategory = z.infer<typeof PrebuiltReviewUpgradeFacetCategory>;
export const PrebuiltReviewUpgradeFacetCategory = z.enum([
  'tags',
  'severity',
  'name',
  'type',
  'customization_status',
]);

/** Subset of {@link RuleResponse} keys clients may request to trim payloads. */
export const PREBUILT_REVIEW_RULE_RESPONSE_FIELD_ALLOWLIST = new Set([
  'id',
  'rule_id',
  'name',
  'tags',
  'severity',
  'risk_score',
  'type',
  'version',
  'description',
  'language',
  'immutable',
  'enabled',
]);

export const PrebuiltReviewQueryExtensions = z.object({
  /**
   * KQL filter using friendly field names (name, tags, severity, risk_score, rule_id)
   * or full `security-rule.*` paths. Combined with structured `filter` when both are sent.
   */
  filter_kql: z.string().max(MAX_FIND_RULES_WITH_FACETS_FILTER_KQL_LENGTH).optional(),
  search_mode: z.literal('legacy').optional(),
  search_term: z.string().max(MAX_FIND_RULES_WITH_FACETS_SEARCH_TERM_LENGTH).optional(),
  include_counts: z.array(PrebuiltReviewInstallFacetCategory).max(16).optional(),
  cursor: z.string().optional(),
  fields: z.array(z.string()).max(64).optional(),
});

export const PrebuiltReviewUpgradeQueryExtensions = z.object({
  filter_kql: z.string().max(MAX_FIND_RULES_WITH_FACETS_FILTER_KQL_LENGTH).optional(),
  search_mode: z.literal('legacy').optional(),
  search_term: z.string().max(MAX_FIND_RULES_WITH_FACETS_SEARCH_TERM_LENGTH).optional(),
  include_counts: z.array(PrebuiltReviewUpgradeFacetCategory).max(16).optional(),
  cursor: z.string().optional(),
  fields: z.array(z.string()).max(64).optional(),
});

export type PrebuiltReviewCountsResponse = FacetCounts;
