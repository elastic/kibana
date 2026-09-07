/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IUiSettingsClient, KibanaRequest, Logger } from '@kbn/core/server';
import type { InferenceServerStart } from '@kbn/inference-plugin/server';
import type { SearchInferenceEndpointsPluginStart } from '@kbn/search-inference-endpoints/server';
import type { ScopedModel } from '@kbn/agent-builder-server';
import { GEN_AI_SETTINGS_DEFAULT_AI_CONNECTOR } from '@kbn/management-settings-ids';

const NO_DEFAULT_CONNECTOR = 'NO_DEFAULT_CONNECTOR';

/**
 * Resolves the default GenAI connector the same way ES|QL NL search does:
 * the `genAi:defaultAIConnector` advanced setting first, then the inference
 * plugin's own default.
 */
const resolveConnectorId = async ({
  uiSettingsClient,
  inference,
  request,
  logger,
}: {
  uiSettingsClient: IUiSettingsClient;
  inference: InferenceServerStart;
  request: KibanaRequest;
  logger: Logger;
}): Promise<string | undefined> => {
  try {
    const defaultSetting = await uiSettingsClient.get<string>(GEN_AI_SETTINGS_DEFAULT_AI_CONNECTOR);
    if (defaultSetting && defaultSetting !== NO_DEFAULT_CONNECTOR) {
      return defaultSetting;
    }
  } catch (err) {
    // The setting may not be registered, but a serialization or permission
    // failure lands here too and would otherwise be invisible.
    logger.warn(
      `[ti:inference] reading ${GEN_AI_SETTINGS_DEFAULT_AI_CONNECTOR} failed — ` +
        `falling through to the inference default. ${(err as Error).message}`
    );
  }

  try {
    const connector = await inference.getDefaultConnector(request);
    return connector?.connectorId;
  } catch (err) {
    // Commonly just "no connectors configured", so debug rather than warn.
    logger.debug(
      `[ti:inference] inference.getDefaultConnector found no usable connector. ${
        (err as Error).message
      }`
    );
  }

  return undefined;
};

/**
 * Endpoints registered for this feature, in preference order: the operator's pick
 * in Stack Management > Model Settings first, then the feature's
 * `recommendedEndpoints`, already filtered by the registry to what is actually
 * provisioned on this deployment.
 *
 * Returns the whole list rather than just the head. Each feature registers two
 * recommended endpoints so there is somewhere to go when the preferred one is
 * unusable, and only trying the first meant a registered-but-broken endpoint
 * skipped straight past the alternative to a hard failure.
 *
 * Returns an empty list (rather than throwing) so the caller can decide.
 */
const resolveFeatureEndpointIds = async ({
  searchInferenceEndpoints,
  featureId,
  request,
  logger,
}: {
  searchInferenceEndpoints: SearchInferenceEndpointsPluginStart | undefined;
  featureId: string;
  request: KibanaRequest;
  logger: Logger;
}): Promise<string[]> => {
  if (!searchInferenceEndpoints) return [];

  try {
    const { endpoints } = await searchInferenceEndpoints.endpoints.getForFeature(
      featureId,
      request
    );
    return endpoints.map((endpoint) => endpoint.connectorId).filter(Boolean);
  } catch (err) {
    logger.warn(
      `[ti:inference] feature='${featureId}' registry lookup failed — ` +
        `falling through. ${(err as Error).message}`
    );
    return [];
  }
};

// The inference plugin names this property `connectorId`; we pass our inference
// endpoint id through to it unchanged.
const buildScopedModel = async ({
  inference,
  request,
  inferenceEndpointId,
}: {
  inference: InferenceServerStart;
  request: KibanaRequest;
  inferenceEndpointId: string;
}): Promise<ScopedModel> => {
  const chatModel = await inference.getChatModel({
    request,
    connectorId: inferenceEndpointId,
    chatModelOptions: {},
  });
  const inferenceClient = inference.getClient({
    request,
    bindTo: { connectorId: inferenceEndpointId },
  });
  const connector = await inference.getConnectorById(inferenceEndpointId, request);
  return { connector, chatModel, inferenceClient };
};

/**
 * Attempt to build a ScopedModel for the given inference endpoint id.
 * Returns null and emits a warn log on failure so the caller can try the next
 * fallback in the chain.  The greppable `[ti:inference]` prefix + label make
 * each fallback hop queryable in logs — a warn here means silent degradation is
 * happening and the operator should investigate the endpoint configuration.
 */
const tryBuildScoped = async (
  inference: InferenceServerStart,
  request: KibanaRequest,
  inferenceEndpointId: string,
  label: string,
  logger: Logger
): Promise<ScopedModel | null> => {
  try {
    return await buildScopedModel({ inference, request, inferenceEndpointId });
  } catch (err) {
    logger.warn(
      `[ti:inference] ${label} inference_endpoint='${inferenceEndpointId}' unavailable — ` +
        `falling through. ${(err as Error).message}`
    );
    return null;
  }
};

export type ResolveScopedModelOutcome =
  | { ok: true; model: ScopedModel }
  | { ok: false; reason: 'no_inference_plugin' | 'no_connector'; message: string };

/**
 * Resolves a `ScopedModel` for an LLM-backed threat-intel route using
 * an ordered fallback chain.  Returns a structured failure (no throw) when no
 * connector can be built so the caller can surface a 400 / 503.
 *
 * Chain (first successful build wins):
 *   1. The inference feature registry entry for `featureId` — the admin's choice
 *      in Stack Management > Model Settings, then the feature's
 *      `recommendedEndpoints`. Falls through with a `[ti:inference]` warn when the
 *      resolved endpoint is absent on this deployment.
 *   2. `genAi:defaultAIConnector` / `inference.getDefaultConnector`, but ONLY when
 *      the optional `searchInferenceEndpoints` plugin is absent, which is the case
 *      this hop exists for. Both threat-intel features register with
 *      `ignoreGlobalDefault: true` so the enrich and Diamond stages stay on
 *      different tiers; taking the cluster-wide default here whenever the registry
 *      came back empty would collapse them back onto one model and undo that.
 *   3. `no_connector` — returned as a structured failure; nothing is available at all.
 *
 * @param featureId - Registered inference feature for this stage, so the enrich
 *   and Diamond stages can run on different models.
 * @param logger - Used to emit `[ti:inference]` warn lines on each fallback hop.
 */
export const resolveScopedModel = async ({
  inference,
  searchInferenceEndpoints,
  request,
  uiSettingsClient,
  featureId,
  logger,
}: {
  inference: InferenceServerStart | undefined;
  searchInferenceEndpoints: SearchInferenceEndpointsPluginStart | undefined;
  request: KibanaRequest;
  uiSettingsClient: IUiSettingsClient;
  featureId: string;
  logger: Logger;
}): Promise<ResolveScopedModelOutcome> => {
  if (!inference) {
    return {
      ok: false,
      reason: 'no_inference_plugin',
      message:
        'The optional `inference` plugin is not available in this Kibana deployment. ' +
        'LLM-backed threat-intel routes are unavailable.',
    };
  }

  // 1. Operator's pick for this stage, then the feature's recommended endpoints,
  //    each tried in turn so a registered-but-unusable endpoint does not skip the
  //    alternative the feature registered for exactly this case.
  const featureEndpointIds = await resolveFeatureEndpointIds({
    searchInferenceEndpoints,
    featureId,
    request,
    logger,
  });
  for (const endpointId of featureEndpointIds) {
    const model = await tryBuildScoped(
      inference,
      request,
      endpointId,
      `feature='${featureId}'`,
      logger
    );
    if (model) return { ok: true, model };
  }

  // 2. Space-wide genAi:defaultAIConnector / inference.getDefaultConnector, only
  //    for deployments that do not have the registry at all. When the registry is
  //    installed it is the single source of truth for this feature's model, and
  //    falling back past it would defeat `ignoreGlobalDefault`.
  if (!searchInferenceEndpoints) {
    const fallbackId = await resolveConnectorId({ inference, request, uiSettingsClient, logger });
    if (fallbackId) {
      const model = await tryBuildScoped(inference, request, fallbackId, 'genAi-default', logger);
      if (model) return { ok: true, model };
    }
  } else {
    logger.warn(
      `[ti:inference] feature='${featureId}' resolved no usable endpoint. Not falling back to ` +
        `genAi:defaultAIConnector, because this feature sets ignoreGlobalDefault so the enrich ` +
        `and Diamond stages cannot collapse onto one model. Pick a model for this feature in ` +
        `Stack Management > Model Settings.`
    );
  }

  return {
    ok: false,
    reason: 'no_connector',
    message:
      'No model is configured for this threat intelligence stage. Pick one in ' +
      'Stack Management > Model Settings, or set `genAi:defaultAIConnector` in advanced settings.',
  };
};
