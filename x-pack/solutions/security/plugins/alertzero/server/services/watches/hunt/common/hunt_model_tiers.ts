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
import { selectHuntCallModel } from './select_hunt_call_model';

/**
 * The tiers a hunt has a consumer for. Balanced is registered for the other AlertZero Workers but
 * nothing in the hunt runs on it: Tier 2 ES|QL generation moved back to Frontier after Claude
 * Sonnet 5 on EIS refused the hunt's generation prompt (`finish_reason: content_filter`) for
 * nearly every behavior of a threat report, which Opus 5 answers.
 */
export const HUNT_MODEL_TIERS: readonly HuntModelTier[] = ['efficient', 'frontier'];

/** The AlertZero inference feature each hunt tier resolves its model through. */
export const HUNT_MODEL_TIER_FEATURE_IDS: Record<HuntModelTier, string> = {
  efficient: ALERTZERO_EFFICIENT_INFERENCE_FEATURE_ID,
  balanced: ALERTZERO_BALANCED_INFERENCE_FEATURE_ID,
  frontier: ALERTZERO_FRONTIER_INFERENCE_FEATURE_ID,
};

/** The tiers Tier 2 needs: Frontier, for both extraction and ES|QL generation. */
export const TIER2_MODEL_TIERS: readonly HuntModelTier[] = ['frontier'];

const HUNT_MODEL_TIER_LABELS: Record<HuntModelTier, string> = {
  efficient: 'Efficient',
  balanced: 'Balanced',
  frontier: 'Frontier',
};

/**
 * True when every consumer of the tier received a model. A Cyber domain model
 * covers the consumers `selectHuntCallModel` assigns it to, so an empty Efficient
 * slot is still covered when that model runs dataset matching and recommendations.
 * Frontier stays uncovered when ES|QL generation has no messages model, which is
 * a template-required Cyber connector with no Frontier tier.
 */
const tierConsumersCovered = (models: HuntModels, tier: HuntModelTier): boolean => {
  if (tier === 'efficient') {
    return selectHuntCallModel({ tierModel: models.efficient, cyberModel: models.cyber }) != null;
  }
  if (tier === 'frontier') {
    return (
      selectHuntCallModel({ tierModel: models.frontier, cyberModel: models.cyber }) != null &&
      selectHuntCallModel({
        tierModel: models.frontier,
        cyberModel: models.cyber,
        messagesOnly: true,
      }) != null
    );
  }
  return models[tier] != null;
};

/**
 * Tiers whose consumers had no model, in tier order. A tier is listed only when
 * the effective selection left one of its consumers without a model.
 */
export const unavailableModelTiers = (
  models: HuntModels,
  tiers: readonly HuntModelTier[] = HUNT_MODEL_TIERS
): HuntModelTier[] => tiers.filter((tier) => !tierConsumersCovered(models, tier));

/**
 * `Balanced tier`, `Balanced and Frontier tiers`, or `Efficient, Balanced and Frontier tiers`.
 * Empty for no tiers, so a caller cannot ship the string "undefined tier".
 */
export const describeModelTiers = (tiers: readonly HuntModelTier[]): string => {
  const labels = tiers.map((tier) => HUNT_MODEL_TIER_LABELS[tier]);
  if (labels.length === 0) return '';
  const list =
    labels.length > 1
      ? `${labels.slice(0, -1).join(', ')} and ${labels[labels.length - 1]}`
      : labels[0];
  return `${list} ${labels.length > 1 ? 'tiers' : 'tier'}`;
};
