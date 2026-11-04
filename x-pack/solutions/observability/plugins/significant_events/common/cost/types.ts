/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  NIGHTSHIFT_DISCOVERY_USAGE_ID,
  NIGHTSHIFT_INVESTIGATION_USAGE_ID,
  NIGHTSHIFT_INVESTIGATION_MEMORY_USAGE_ID,
  NIGHTSHIFT_KI_EXTRACTION_USAGE_ID,
  NIGHTSHIFT_KI_QUERY_GENERATION_USAGE_ID,
} from '@kbn/nightshift-shared';

export const COST_BUDGET_GROUPS = ['discovery', 'investigation', 'ki_extraction'] as const;

export type CostBudgetGroup = (typeof COST_BUDGET_GROUPS)[number];

export type CostStatus = 'complete' | 'partial' | 'unavailable';

export interface BudgetGroupCost {
  group: CostBudgetGroup;
  status: CostStatus;
  estimatedCost: number | null;
  totalTokens: number;
  priceableTokens: number;
  unpriceableTokens: number;
  tierCrossingCount: number;
}

export interface PeriodCost {
  label: 'today' | 'this_month';
  periodStart: string;
  periodEnd: string;
  groups: BudgetGroupCost[];
  totalEstimatedCost: number | null;
  totalStatus: CostStatus;
  totalTokens: number;
  unknownFeatureTokens: number;
  unknownFeatureDocCount: number;
}

export type CostUnavailableReason = 'pricing' | 'usage_data';

export type TokenTrackingCoverage =
  | {
      status: 'none' | 'partial' | 'full';
      enabledSpaceCount: number;
      totalSpaceCount: number;
    }
  | {
      status: 'unavailable';
      enabledSpaceCount: null;
      totalSpaceCount: null;
    };

export type CostCaveat =
  | 'eis_pricing_assumed'
  | 'usd_assumed'
  | 'excludes_embeddings'
  | 'excludes_failed_calls'
  | 'excludes_cache_writes'
  | 'tracking_not_all_spaces'
  | 'prices_stale'
  | 'tier_crossings_detected';

export interface CostResponse {
  today: PeriodCost;
  month: PeriodCost;
  asOf: string;
  pricesFetchedAt: string | null;
  pricesStale: boolean;
  unavailableReason: CostUnavailableReason | null;
  caveats: CostCaveat[];
  trackingCoverage: TokenTrackingCoverage;
}

export const FEATURE_ID_TO_COST_BUDGET_GROUP: Readonly<Record<string, CostBudgetGroup>> = {
  [NIGHTSHIFT_DISCOVERY_USAGE_ID]: 'discovery',
  [NIGHTSHIFT_INVESTIGATION_USAGE_ID]: 'investigation',
  [NIGHTSHIFT_INVESTIGATION_MEMORY_USAGE_ID]: 'investigation',
  [NIGHTSHIFT_KI_EXTRACTION_USAGE_ID]: 'ki_extraction',
  [NIGHTSHIFT_KI_QUERY_GENERATION_USAGE_ID]: 'ki_extraction',
};
