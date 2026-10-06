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
 * Every deployment-default connector worth trying, in preference order: the
 * operator's `genAi:defaultAIConnector`, then the inference default.
 *
 * Both are collected rather than just the first that resolves. The setting can
 * name a connector that has since been deleted or had its credentials revoked,
 * and returning only that id meant a stale setting took Tier 2 down even where
 * another usable default existed — the caller could not tell "this id is the
 * answer" from "this id is the first guess".
 */
const resolveFallbackConnectors = async ({
  uiSettingsClient,
  inference,
  request,
}: {
  uiSettingsClient: IUiSettingsClient;
  inference: InferenceServerStart;
  request: KibanaRequest;
}): Promise<Array<{ connectorId: string; label: string }>> => {
  const candidates: Array<{ connectorId: string; label: string }> = [];

  try {
    const defaultSetting = await uiSettingsClient.get<string>(GEN_AI_SETTINGS_DEFAULT_AI_CONNECTOR);
    if (defaultSetting && defaultSetting !== NO_DEFAULT_CONNECTOR) {
      candidates.push({ connectorId: defaultSetting, label: 'genAi-default' });
    }
  } catch {
    // UI setting may not be registered; the inference default still applies.
  }

  try {
    const connector = await inference.getDefaultConnector(request);
    const connectorId = connector?.connectorId;
    if (connectorId && !candidates.some((candidate) => candidate.connectorId === connectorId)) {
      candidates.push({ connectorId, label: 'inference-default' });
    }
  } catch {
    // No connectors available.
  }

  return candidates;
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
      `[hunt:connector] ${label} connector='${connectorId}' unavailable — falling through. ` +
        `${(err as Error).message}`
    );
    return null;
  }
};

type ResolveScopedModelOutcome =
  | { ok: true; model: ScopedModel }
  | { ok: false; reason: 'no_inference_plugin' | 'no_connector'; message: string };

/**
 * Resolves the connector an operator picked for an AlertZero model tier in
 * Stack Management > Model Settings.
 *
 * The tier connector takes precedence over the deployment default on purpose.
 * The tiers register with `ignoreGlobalDefault: true`, so falling through to
 * the default connector would silently resolve a different model than the
 * operator chose.
 *
 * If no tier connector is found, the function falls through to the genAI
 * deployment default. This differs from the source's `ignoreGlobalDefault`
 * behaviour, but is intentional: hunt callers always want a model even when
 * no tier-specific connector is configured.
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
  logger,
}: {
  inference: InferenceServerStart | undefined;
  /** Optional plugin: absent deployments fall back to the connector chain below. */
  searchInferenceEndpoints?: SearchInferenceEndpointsPluginStart;
  /** AlertZero model tier to resolve, e.g. `alertzero_reasoning` for Tier 2. */
  featureId: string;
  request: KibanaRequest;
  uiSettingsClient: IUiSettingsClient;
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

  if (searchInferenceEndpoints) {
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

  const fallbacks = await resolveFallbackConnectors({ inference, request, uiSettingsClient });
  for (const { connectorId, label } of fallbacks) {
    const model = await tryBuildScoped(inference, request, connectorId, label, logger);
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
