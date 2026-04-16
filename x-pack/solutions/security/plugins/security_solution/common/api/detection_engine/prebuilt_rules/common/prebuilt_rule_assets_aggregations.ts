/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';

/**
 * Facet categories available for prebuilt rule asset aggregations. Only
 * attributes that exist on the asset saved object are supported.
 */
export type PrebuiltRuleAssetsFacetCategory = z.infer<typeof PrebuiltRuleAssetsFacetCategory>;
export const PrebuiltRuleAssetsFacetCategory = z.enum(['tags', 'type']);
export type PrebuiltRuleAssetsFacetCategoryEnum = typeof PrebuiltRuleAssetsFacetCategory.enum;
export const PrebuiltRuleAssetsFacetCategoryEnum = PrebuiltRuleAssetsFacetCategory.enum;

/**
 * Aggregation options for prebuilt rule asset queries.
 */
export type PrebuiltRuleAssetsAggregations = z.infer<typeof PrebuiltRuleAssetsAggregations>;
export const PrebuiltRuleAssetsAggregations = z
  .object({
    /**
     * Facet categories for which to compute counts over the filtered + searched set.
     */
    counts: z.array(PrebuiltRuleAssetsFacetCategory).optional(),
  })
  .strict();
