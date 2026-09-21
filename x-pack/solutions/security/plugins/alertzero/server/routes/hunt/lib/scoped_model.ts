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

/** Ported verbatim from mustard `routes/lib/scoped_model.ts`. */

const NO_DEFAULT_CONNECTOR = 'NO_DEFAULT_CONNECTOR';

const resolveConnectorId = async ({
  uiSettingsClient,
  inference,
  request,
}: {
  uiSettingsClient: IUiSettingsClient;
  inference: InferenceServerStart;
  request: KibanaRequest;
}): Promise<string | undefined> => {
  try {
    const defaultSetting = await uiSettingsClient.get<string>(GEN_AI_SETTINGS_DEFAULT_AI_CONNECTOR);
    if (defaultSetting && defaultSetting !== NO_DEFAULT_CONNECTOR) {
      return defaultSetting;
    }
  } catch {
    // UI setting may not be registered; fall through to the inference default.
  }

  try {
    const connector = await inference.getDefaultConnector(request);
    return connector?.connectorId;
  } catch {
    // No connectors available.
  }

  return undefined;
};

const buildScopedModel = async ({
  inference,
  request,
  connectorId,
}: {
  inference: InferenceServerStart;
  request: KibanaRequest;
  connectorId: string;
}): Promise<ScopedModel> => {
  const chatModel = await inference.getChatModel({ request, connectorId, chatModelOptions: {} });
  const inferenceClient = inference.getClient({ request, bindTo: { connectorId } });
  const connector = await inference.getConnectorById(connectorId, request);
  return { connector, chatModel, inferenceClient };
};

const tryBuildScoped = async (
  inference: InferenceServerStart,
  request: KibanaRequest,
  connectorId: string,
  label: string,
  logger: Logger
): Promise<ScopedModel | null> => {
  try {
    return await buildScopedModel({ inference, request, connectorId });
  } catch (err) {
    logger.warn(
      `[ti:connector] ${label} connector='${connectorId}' unavailable — falling through. ` +
        `${(err as Error).message}`
    );
    return null;
  }
};

export type ResolveScopedModelOutcome =
  | { ok: true; model: ScopedModel }
  | { ok: false; reason: 'no_inference_plugin' | 'no_connector'; message: string };

/**
 * Resolves the connector an operator picked for an AlertZero model tier in
 * Stack Management > Model Settings.
 *
 * This runs ahead of the deployment default on purpose. The tiers register with
 * `ignoreGlobalDefault: true`, so falling straight through to the default
 * connector does not merely skip a preference, it resolves a different model
 * than the operator chose and silently undoes the tiering.
 */
const resolveTierConnectorId = async ({
  searchInferenceEndpoints,
  featureId,
  request,
  logger,
}: {
  searchInferenceEndpoints: SearchInferenceEndpointsPluginStart;
  featureId: string;
  request: KibanaRequest;
  logger: Logger;
}): Promise<string | undefined> => {
  try {
    const { endpoints } = await searchInferenceEndpoints.endpoints.getForFeature(
      featureId,
      request
    );
    return endpoints[0]?.connectorId;
  } catch (err) {
    logger.warn(
      `[hunt:connector] tier '${featureId}' could not be resolved, falling through. ${
        (err as Error).message
      }`
    );
    return undefined;
  }
};

export const resolveScopedModel = async ({
  inference,
  searchInferenceEndpoints,
  featureId,
  request,
  uiSettingsClient,
  connectorIdOverride,
  logger,
}: {
  inference: InferenceServerStart | undefined;
  /** Optional plugin: absent deployments fall back to the connector chain below. */
  searchInferenceEndpoints?: SearchInferenceEndpointsPluginStart;
  /** AlertZero model tier to resolve, e.g. `alertzero_reasoning` for Tier 2. */
  featureId?: string;
  request: KibanaRequest;
  uiSettingsClient: IUiSettingsClient;
  connectorIdOverride?: string;
  logger: Logger;
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

  if (connectorIdOverride) {
    const model = await tryBuildScoped(
      inference,
      request,
      connectorIdOverride,
      'stage-override',
      logger
    );
    if (model) return { ok: true, model };
  }

  if (searchInferenceEndpoints && featureId) {
    const tierId = await resolveTierConnectorId({
      searchInferenceEndpoints,
      featureId,
      request,
      logger,
    });
    if (tierId) {
      const model = await tryBuildScoped(inference, request, tierId, `tier:${featureId}`, logger);
      if (model) return { ok: true, model };
    }
  }

  const fallbackId = await resolveConnectorId({ inference, request, uiSettingsClient });
  if (fallbackId) {
    const model = await tryBuildScoped(inference, request, fallbackId, 'genAi-default', logger);
    if (model) return { ok: true, model };
  }

  return {
    ok: false,
    reason: 'no_connector',
    message:
      'No GenAI connector is configured or available. Set `genAi:defaultAIConnector` in ' +
      'advanced settings, or configure a GenAI connector for the current user.',
  };
};
