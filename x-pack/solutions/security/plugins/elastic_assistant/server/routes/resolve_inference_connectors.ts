/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest } from '@kbn/core/server';
import type { InferenceConnector } from '@kbn/inference-common';
import { MODEL_SETTINGS_FEATURE_FLAG_ID } from '@kbn/search-inference-endpoints/common/constants';
import { ELASTIC_AI_ASSISTANT_INFERENCE_FEATURE_ID } from '../../common/constants';
import type { ElasticAssistantApiRequestHandlerContext } from '../types';

/**
 * Returns a single connector by id for the AI Assistant for Security.
 *
 * When Model Settings is enabled and SIEP returns endpoints, the connector must be
 * in them — otherwise undefined is returned and the caller falls back gracefully.
 * When Model Settings is disabled, falls back to the inference plugin.
 */
export async function resolveConnectorById({
  assistantContext,
  request,
  connectorId,
}: {
  assistantContext: ElasticAssistantApiRequestHandlerContext;
  request: KibanaRequest;
  connectorId: string;
}): Promise<InferenceConnector | undefined> {
  const modelSettingsEnabled = await assistantContext.core.uiSettings.client.get<boolean>(
    MODEL_SETTINGS_FEATURE_FLAG_ID,
    false
  );

  if (modelSettingsEnabled && assistantContext.searchInferenceEndpoints) {
    try {
      const { endpoints, warnings } =
        await assistantContext.searchInferenceEndpoints.endpoints.getForFeature(
          ELASTIC_AI_ASSISTANT_INFERENCE_FEATURE_ID,
          request
        );
      warnings.forEach((w) => assistantContext.logger.warn(w));
      return endpoints.find((c) => c.connectorId === connectorId);
    } catch (error) {
      assistantContext.logger.warn(
        `Failed to resolve inference endpoints for AI Assistant for Security. ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    }
  }

  return assistantContext.inference.getConnectorById(connectorId, request).catch(() => undefined);
}
