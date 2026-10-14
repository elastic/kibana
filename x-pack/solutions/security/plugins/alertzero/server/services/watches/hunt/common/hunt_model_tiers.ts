/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  ALERTZERO_BALANCED_INFERENCE_FEATURE_ID,
  ALERTZERO_EFFICIENT_INFERENCE_FEATURE_ID,
  ALERTZERO_FRONTIER_INFERENCE_FEATURE_ID,
} from '@kbn/alertzero-common';
import type { HuntModels, HuntModelTier } from '../types';

export const HUNT_MODEL_TIERS: readonly HuntModelTier[] = ['efficient', 'balanced', 'frontier'];

/** The AlertZero inference feature each hunt tier resolves its model through. */
export const HUNT_MODEL_TIER_FEATURE_IDS: Record<HuntModelTier, string> = {
  efficient: ALERTZERO_EFFICIENT_INFERENCE_FEATURE_ID,
  balanced: ALERTZERO_BALANCED_INFERENCE_FEATURE_ID,
  frontier: ALERTZERO_FRONTIER_INFERENCE_FEATURE_ID,
};

/** The tiers Tier 2 needs together: Frontier for extraction, Balanced for ES|QL generation. */
export const TIER2_MODEL_TIERS: readonly HuntModelTier[] = ['balanced', 'frontier'];

const HUNT_MODEL_TIER_LABELS: Record<HuntModelTier, string> = {
  efficient: 'Efficient',
  balanced: 'Balanced',
  frontier: 'Frontier',
};

/** The tiers with no usable model, in tier order. */
export const unavailableModelTiers = (
  models: HuntModels,
  tiers: readonly HuntModelTier[] = HUNT_MODEL_TIERS
): HuntModelTier[] => tiers.filter((tier) => !models[tier]);

/** `Balanced`, `Balanced and Frontier`, or `Efficient, Balanced and Frontier`, plus the noun. */
export const describeModelTiers = (tiers: readonly HuntModelTier[]): string => {
  const labels = tiers.map((tier) => HUNT_MODEL_TIER_LABELS[tier]);
  const list =
    labels.length > 1
      ? `${labels.slice(0, -1).join(', ')} and ${labels[labels.length - 1]}`
      : labels[0];
  return `${list} ${labels.length > 1 ? 'tiers' : 'tier'}`;
};
