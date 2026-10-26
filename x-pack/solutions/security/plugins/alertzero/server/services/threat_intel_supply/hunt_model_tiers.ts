/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IUiSettingsClient, KibanaRequest, Logger } from '@kbn/core/server';
import type { InferenceServerStart } from '@kbn/inference-plugin/server';
import type { SearchInferenceEndpointsPluginStart } from '@kbn/search-inference-endpoints/server';
import type { HuntModelTierState, HuntModelTierStatus } from '@kbn/alertzero-common';
import {
  HUNT_MODEL_TIERS,
  HUNT_MODEL_TIER_FEATURE_IDS,
} from '../watches/hunt/common/hunt_model_tiers';
import { walkHuntTierConnectors } from '../watches/hunt/common/hunt_tier_connectors';
import type { HuntModelTier } from '../watches/hunt/types';

interface TierDeps {
  inference: InferenceServerStart | undefined;
  searchInferenceEndpoints: SearchInferenceEndpointsPluginStart | undefined;
  uiSettingsClient: IUiSettingsClient;
  request: KibanaRequest;
  logger: Logger;
}

/**
 * The connector exists, as far as the inference plugin can tell. This does not build a model, so a
 * connector that exists but fails to build at run time still reads as present.
 */
const connectorExists = async (
  inference: InferenceServerStart,
  request: KibanaRequest,
  connectorId: string
): Promise<boolean> => {
  try {
    await inference.getConnectorById(connectorId, request);
    return true;
  } catch {
    return false;
  }
};

/**
 * Classifies a tier by walking the same connectors, in the same order, that `resolveScopedModel`
 * walks, and accepting the first that exists instead of the first that builds.
 *
 * The tier's own first endpoint wins when it exists. The registry flags how it got there: a saved
 * pick is `configured`, a provisioned recommendation is `recommended`, and anything else is the
 * catalog with the platform default first (or the default connector of a deployment set to use it
 * exclusively), which is `default_fallback`. When the tier's list is empty Hunt runs on a
 * deployment default, so the tier is `unavailable` only if no default connector exists either.
 * A saved pick whose models are gone is `configured_missing` rather than a plain fallback,
 * because that is the one case where the operator has something to repair.
 *
 * A `genAi:defaultAIConnector` setting naming a deleted connector is skipped, so it cannot make a
 * tier read as running when every hunt would skip Tier 2. A connector that exists but fails to
 * build at run time is the one case this cannot see.
 */
const classifyTier = async (tier: HuntModelTier, deps: TierDeps): Promise<HuntModelTierState> => {
  // Without the inference plugin Hunt cannot build any model, whatever the registry says.
  const { inference } = deps;
  if (!inference) return 'unavailable';

  const { tier: read, accepted } = await walkHuntTierConnectors({
    ...deps,
    inference,
    featureId: HUNT_MODEL_TIER_FEATURE_IDS[tier],
    purpose: 'report',
    // The tier's own endpoint was fetched by id when the registry listed it, so only a deployment
    // default needs checking.
    accept: async ({ connectorId, source }) =>
      source === 'tier' || (await connectorExists(inference, deps.request, connectorId))
        ? connectorId
        : undefined,
  });

  if (!accepted) return 'unavailable';
  if (accepted.connector.source === 'tier') {
    if (read.soEntryFound) return 'configured';
    return read.isRecommended ? 'recommended' : 'default_fallback';
  }
  return read.soEntryFound ? 'configured_missing' : 'default_fallback';
};

/**
 * Where each Hunt model tier gets its model, as the requesting user resolves it. Informational:
 * Hunt degrades rather than fails when a tier has no model, so this never feeds the hard gate.
 */
export const evaluateHuntModelTiers = async (deps: TierDeps): Promise<HuntModelTierStatus[]> =>
  Promise.all(
    HUNT_MODEL_TIERS.map(async (tier) => ({ tier, state: await classifyTier(tier, deps) }))
  );
