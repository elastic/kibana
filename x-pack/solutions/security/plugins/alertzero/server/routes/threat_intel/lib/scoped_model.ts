/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IUiSettingsClient, KibanaRequest, Logger } from '@kbn/core/server';
import type { InferenceServerStart } from '@kbn/inference-plugin/server';
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

export const resolveScopedModel = async ({
  inference,
  request,
  uiSettingsClient,
  connectorIdOverride,
  logger,
}: {
  inference: InferenceServerStart | undefined;
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
