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
import { walkHuntTierConnectors } from '../../../services/watches/hunt/common/hunt_tier_connectors';

type ChatModelOptions = Parameters<InferenceServerStart['getChatModel']>[0]['chatModelOptions'];

const buildScopedModel = async ({
  inference,
  request,
  connectorId,
  chatModelOptions,
}: {
  inference: InferenceServerStart;
  request: KibanaRequest;
  connectorId: string;
  chatModelOptions: ChatModelOptions;
}): Promise<ScopedModel> => {
  const chatModel = await inference.getChatModel({ request, connectorId, chatModelOptions });
  const inferenceClient = inference.getClient({ request, bindTo: { connectorId } });
  const connector = await inference.getConnectorById(connectorId, request);
  return { connector, chatModel, inferenceClient };
};

const tryBuildScoped = async (
  inference: InferenceServerStart,
  request: KibanaRequest,
  connectorId: string,
  label: string,
  logger: Logger,
  chatModelOptions: ChatModelOptions
): Promise<ScopedModel | null> => {
  try {
    return await buildScopedModel({ inference, request, connectorId, chatModelOptions });
  } catch (err) {
    logger.warn(
      `[hunt:connector] ${label} connector='${connectorId}' unavailable — falling through. ` +
        `${(err as Error).message}`
    );
    return null;
  }
};

type ResolveScopedModelOutcome =
  | { ok: true; model: ScopedModel }
  | { ok: false; reason: 'no_inference_plugin' | 'no_connector'; message: string };

export const resolveScopedModel = async ({
  inference,
  searchInferenceEndpoints,
  featureId,
  request,
  uiSettingsClient,
  logger,
  chatModelOptions = {},
}: {
  inference: InferenceServerStart | undefined;
  /** Optional plugin: absent deployments fall back to the connector chain below. */
  searchInferenceEndpoints?: SearchInferenceEndpointsPluginStart;
  /** AlertZero model tier to resolve, e.g. `alertzero_frontier` for Tier 2. */
  featureId: string;
  request: KibanaRequest;
  uiSettingsClient: IUiSettingsClient;
  logger: Logger;
  /** Passed to the chat model, e.g. telemetry metadata that attributes its token usage. */
  chatModelOptions?: ChatModelOptions;
}): Promise<ResolveScopedModelOutcome> => {
  if (!inference) {
    return {
      ok: false,
      reason: 'no_inference_plugin',
      message:
        'The optional `inference` plugin is not available in this Kibana deployment. ' +
        'LLM-backed hunt routes are unavailable.',
    };
  }

  const { accepted } = await walkHuntTierConnectors({
    searchInferenceEndpoints,
    inference,
    uiSettingsClient,
    featureId,
    request,
    logger,
    accept: ({ connectorId, label }) =>
      tryBuildScoped(inference, request, connectorId, label, logger, chatModelOptions),
  });
  if (accepted) return { ok: true, model: accepted.value };

  return {
    ok: false,
    reason: 'no_connector',
    message:
      'No GenAI connector is configured or available. Set `genAi:defaultAIConnector` in ' +
      'advanced settings, or configure a GenAI connector for the current user.',
  };
};

/**
 * Builds the connector an operator saved for `featureId`. An empty row, an
 * unregistered feature, and a failed build all return undefined. There is no
 * fallthrough to the deployment default: this read is for a row that must stay
 * unused until someone saves a model on it.
 */
export const resolveConfiguredScopedModel = async ({
  inference,
  searchInferenceEndpoints,
  featureId,
  request,
  logger,
  chatModelOptions = {},
}: {
  inference: InferenceServerStart | undefined;
  searchInferenceEndpoints?: SearchInferenceEndpointsPluginStart;
  featureId: string;
  request: KibanaRequest;
  logger: Logger;
  /** Passed to the chat model, e.g. telemetry metadata that attributes its token usage. */
  chatModelOptions?: ChatModelOptions;
}): Promise<ScopedModel | undefined> => {
  if (!inference || !searchInferenceEndpoints) return undefined;
  if (searchInferenceEndpoints.features.get(featureId) == null) return undefined;

  try {
    const { endpoints } = await searchInferenceEndpoints.endpoints.getForFeature(
      featureId,
      request,
      { onlyReturnConfigured: true }
    );
    const connectorId = endpoints[0]?.connectorId;
    if (!connectorId) return undefined;
    return await buildScopedModel({ inference, request, connectorId, chatModelOptions });
  } catch (err) {
    logger.warn(
      `[hunt:connector] configured feature '${featureId}' could not be built. ${
        (err as Error).message
      }`
    );
    return undefined;
  }
};
