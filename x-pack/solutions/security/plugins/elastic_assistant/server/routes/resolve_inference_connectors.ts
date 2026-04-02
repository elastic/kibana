/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { notFound, serverUnavailable } from '@hapi/boom';
import type { KibanaRequest } from '@kbn/core/server';
import type { InferenceConnector } from '@kbn/inference-common';
import { MODEL_SETTINGS_FEATURE_FLAG_ID } from '@kbn/search-inference-endpoints/common/constants';
import { ELASTIC_AI_ASSISTANT_INFERENCE_FEATURE_ID } from '../../common/constants';
import type { ElasticAssistantApiRequestHandlerContext } from '../types';

/**
 * Returns a single connector by id for the AI Assistant for Security.
 *
 * When Model Settings is enabled and SIEP returns endpoints, the connector must be
 * in them — a 404 is thrown if the requested connectorId is not configured for this
 * feature in the current space.
 * When Model Settings is disabled or SIEP is unavailable, falls back to the inference plugin.
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
  const modelSettingsEnabled = await assistantContext.core.uiSettings.client
    .get<boolean>(MODEL_SETTINGS_FEATURE_FLAG_ID)
    .catch(() => false);

  if (modelSettingsEnabled && assistantContext.searchInferenceEndpoints) {
    let endpoints: InferenceConnector[];
    try {
      const result = await assistantContext.searchInferenceEndpoints.endpoints.getForFeature(
        ELASTIC_AI_ASSISTANT_INFERENCE_FEATURE_ID,
        request
      );
      result.warnings.forEach((w) => assistantContext.logger.warn(w));
      endpoints = result.endpoints;
    } catch (error) {
      assistantContext.logger.warn(
        `Failed to resolve inference endpoints for AI Assistant for Security. ${
          error instanceof Error ? error.message : String(error)
        }`
      );
      throw serverUnavailable(
        'Inference endpoint settings are temporarily unavailable. Try again shortly.'
      );
    }

    const connector = endpoints.find((c) => c.connectorId === connectorId);
    if (!connector) {
      throw notFound(
        `Connector "${connectorId}" is not configured for AI Assistant for Security in this space.`
      );
    }
    return connector;
  }

  return assistantContext.inference.getConnectorById(connectorId, request).catch(() => undefined);
}
