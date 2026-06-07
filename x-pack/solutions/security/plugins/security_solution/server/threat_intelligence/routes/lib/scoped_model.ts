/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IUiSettingsClient, KibanaRequest } from '@kbn/core/server';
import type { InferenceServerStart } from '@kbn/inference-plugin/server';
import type { ScopedModel } from '@kbn/agent-builder-server';
import { GEN_AI_SETTINGS_DEFAULT_AI_CONNECTOR } from '@kbn/management-settings-ids';

/**
 * Build a `ScopedModel` for an internal route handler.
 *
 * Mirrors the helper used by `nl_to_esql_route.ts` so the LLM-using
 * threat-intelligence routes (`hunt_behavior`,
 * `generalize_from_telemetry`) bind to the same default GenAI connector
 * resolution rules as ES|QL NL search.
 */
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

export type ResolveScopedModelOutcome =
  | { ok: true; model: ScopedModel }
  | { ok: false; reason: 'no_inference_plugin' | 'no_connector'; message: string };

/**
 * Resolves a `ScopedModel` for an LLM-backed threat-intelligence route.
 * Returns a structured failure (no throw) when the inference plugin is
 * absent or no GenAI connector is configured so the caller can surface a
 * 400 / 503 with a helpful message.
 *
 * @param connectorIdOverride - When non-empty, bypass the settings-lookup chain
 *   and use this connector ID directly. Pass the value read from a per-stage
 *   advanced setting (e.g. `DIAMOND_GATE_CONNECTOR_SETTING_KEY`) to pin a stage
 *   to a specific model. Falls through to the default `genAi:defaultAIConnector`
 *   when the override is absent or an empty string.
 */
export const resolveScopedModel = async ({
  inference,
  request,
  uiSettingsClient,
  connectorIdOverride,
}: {
  inference: InferenceServerStart | undefined;
  request: KibanaRequest;
  uiSettingsClient: IUiSettingsClient;
  connectorIdOverride?: string;
}): Promise<ResolveScopedModelOutcome> => {
  if (!inference) {
    return {
      ok: false,
      reason: 'no_inference_plugin',
      message:
        'The optional `inference` plugin is not available in this Kibana deployment. ' +
        'LLM-backed threat-intelligence routes are unavailable.',
    };
  }

  const connectorId =
    connectorIdOverride || (await resolveConnectorId({ inference, request, uiSettingsClient }));
  if (!connectorId) {
    return {
      ok: false,
      reason: 'no_connector',
      message:
        'No default GenAI connector is configured. Set `genAi:defaultAIConnector` in advanced ' +
        'settings or configure a GenAI connector for the current user.',
    };
  }

  const model = await buildScopedModel({ inference, request, connectorId });
  return { ok: true, model };
};
