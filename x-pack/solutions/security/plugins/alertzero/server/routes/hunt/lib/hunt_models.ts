/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IUiSettingsClient, KibanaRequest, Logger } from '@kbn/core/server';
import {
  ALERTZERO_INFERENCE_PARENT_FEATURE_ID,
  ALERTZERO_TEMPLATE_INFERENCE_FEATURE_ID,
} from '@kbn/alertzero-common';
import type { InferenceServerStart } from '@kbn/inference-plugin/server';
import type { SearchInferenceEndpointsPluginStart } from '@kbn/search-inference-endpoints/server';
import type { HuntModels, HuntModelTier } from '../../../services/watches/hunt/types';
import {
  HUNT_MODEL_TIERS,
  HUNT_MODEL_TIER_FEATURE_IDS,
} from '../../../services/watches/hunt/common/hunt_model_tiers';
import { resolveConfiguredScopedModel, resolveScopedModel } from './scoped_model';

export interface HuntModelFailure {
  tier: HuntModelTier;
  reason: 'no_inference_plugin' | 'no_connector' | 'resolution_error';
  message: string;
}

const FAILURE_SEVERITY: Record<HuntModelFailure['reason'], number> = {
  no_inference_plugin: 0,
  resolution_error: 1,
  no_connector: 2,
};

/**
 * The failure that should decide a response when several tiers failed: a missing inference plugin
 * outranks a resolution that threw, which outranks a missing connector, so a server-side fault is
 * never hidden behind a client-fixable one. The first of equals wins. `failures` must not be empty.
 */
export const mostSevereFailure = (failures: HuntModelFailure[]): HuntModelFailure =>
  failures.reduce((worst, failure) =>
    FAILURE_SEVERITY[failure.reason] < FAILURE_SEVERITY[worst.reason] ? failure : worst
  );

export interface ResolveHuntModelsOutcome {
  /** Only the tiers that resolved are set; a missing tier degrades only its own consumers. */
  models: HuntModels;
  /** One entry per requested tier that could not be resolved, in the order they were requested. */
  failures: HuntModelFailure[];
}

/**
 * Resolves one model per requested AlertZero tier, independently, so a tier with no usable
 * connector leaves the others intact instead of failing the whole hunt. Never throws: a
 * resolution that throws is reported as a `resolution_error` failure for that tier alone.
 *
 * Each tier goes through `resolveScopedModel`, which reads the tier's list from the registry in
 * default mode: with no operator pick and no provisioned recommendation that is the whole
 * connector catalog, platform default first, so the tier runs on that. The list is empty only
 * when a pick exists but its models are gone, or when there is no connector at all, and
 * `resolveScopedModel` then moves on to the genAi and inference default connectors. A tier fails
 * only when that chain finds nothing too, or when the first connector it finds cannot be built
 * and the rest of the chain cannot either. In practice the tiers tend to fail together.
 *
 * @param tiers - The tiers the caller needs. Defaults to the tiers hunts have a consumer for
 *   (`HUNT_MODEL_TIERS`). A caller that only runs
 *   some consumers (the standalone Tier 2 route) names just those, so it neither resolves nor
 *   reports on a tier it never uses.
 */
export const resolveHuntModels = async ({
  inference,
  searchInferenceEndpoints,
  telemetryPluginId,
  request,
  uiSettingsClient,
  logger,
  tiers = HUNT_MODEL_TIERS,
}: {
  inference: InferenceServerStart | undefined;
  searchInferenceEndpoints?: SearchInferenceEndpointsPluginStart;
  /** Token-usage `feature_id` for every model this call resolves, rolled up under `alertzero_parent`. */
  telemetryPluginId: string;
  request: KibanaRequest;
  uiSettingsClient: IUiSettingsClient;
  logger: Logger;
  tiers?: readonly HuntModelTier[];
}): Promise<ResolveHuntModelsOutcome> => {
  const resolved = await Promise.all(
    tiers.map(
      async (
        tier
      ): Promise<{
        tier: HuntModelTier;
        model?: HuntModels[HuntModelTier];
        failure?: HuntModelFailure;
      }> => {
        try {
          const outcome = await resolveScopedModel({
            inference,
            searchInferenceEndpoints,
            featureId: HUNT_MODEL_TIER_FEATURE_IDS[tier],
            request,
            uiSettingsClient,
            logger,
            chatModelOptions: {
              // Without this the token-usage doc carries no feature_id/parent_feature_id, so the
              // call is invisible to per-feature cost reporting.
              telemetryMetadata: {
                pluginId: telemetryPluginId,
                aggregateBy: ALERTZERO_INFERENCE_PARENT_FEATURE_ID,
              },
            },
          });
          return outcome.ok
            ? { tier, model: outcome.model }
            : { tier, failure: { tier, reason: outcome.reason, message: outcome.message } };
        } catch (err) {
          return {
            tier,
            failure: { tier, reason: 'resolution_error', message: (err as Error).message },
          };
        }
      }
    )
  );

  const models: HuntModels = {};
  const failures: HuntModelFailure[] = [];
  for (const { tier, model, failure } of resolved) {
    if (model) models[tier] = model;
    if (failure) failures.push(failure);
  }

  // Empty when the row has no saved model. Callers then stay on the tier they asked for.
  const cyber = await resolveConfiguredScopedModel({
    inference,
    searchInferenceEndpoints,
    featureId: ALERTZERO_TEMPLATE_INFERENCE_FEATURE_ID,
    request,
    logger,
  });
  if (cyber) models.cyber = cyber;

  return { models, failures };
};
