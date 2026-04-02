/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreStart, KibanaRequest, Logger } from '@kbn/core/server';
import type { InferenceConnector } from '@kbn/inference-common';
import type { InferenceServerStart } from '@kbn/inference-plugin/server';
import type { SearchInferenceEndpointsPluginStart } from '@kbn/search-inference-endpoints/server';
import { MODEL_SETTINGS_FEATURE_FLAG_ID } from '@kbn/search-inference-endpoints/common/constants';
import { OBSERVABILITY_AI_INSIGHTS_INFERENCE_FEATURE_ID } from '../../common/constants';
import { getDefaultConnectorId } from './get_default_connector_id';

interface ResolveInferenceConnectorParams {
  coreStart: CoreStart;
  inference: InferenceServerStart;
  searchInferenceEndpoints?: SearchInferenceEndpointsPluginStart;
  request: KibanaRequest;
  logger: Logger;
}

interface ResolvedConnector {
  connectorId: string;
  connector: InferenceConnector;
}

/**
 * Resolves the inference connector for AI Insights.
 *
 * When Model Settings is enabled and the search inference endpoints plugin
 * returns endpoints for the feature, the first resolved endpoint is used.
 * Otherwise falls back to the default connector resolution.
 */
export async function resolveInferenceConnector({
  coreStart,
  inference,
  searchInferenceEndpoints,
  request,
  logger,
}: ResolveInferenceConnectorParams): Promise<ResolvedConnector> {
  if (searchInferenceEndpoints) {
    const soClient = coreStart.savedObjects.getScopedClient(request);
    const uiSettingsClient = coreStart.uiSettings.asScopedToClient(soClient);
    const modelSettingsEnabled = await uiSettingsClient.get<boolean>(
      MODEL_SETTINGS_FEATURE_FLAG_ID
    );

    if (modelSettingsEnabled) {
      try {
        const resolved = await searchInferenceEndpoints.endpoints.getForFeature(
          OBSERVABILITY_AI_INSIGHTS_INFERENCE_FEATURE_ID,
          request
        );
        resolved.warnings.forEach((w) => logger.warn(w));

        if (resolved.endpoints.length > 0) {
          const connector = resolved.endpoints[0];
          logger.debug(
            `Resolved AI Insights connector via Model Settings: ${connector.connectorId}`
          );
          return { connectorId: connector.connectorId, connector };
        }
      } catch (error) {
        logger.warn(
          `Failed to resolve inference endpoints for AI Insights: ${
            error instanceof Error ? error.message : String(error)
          }`
        );
      }
    }
  }

  const connectorId = await getDefaultConnectorId({ coreStart, inference, request, logger });
  const connector = await inference.getConnectorById(connectorId, request);
  return { connectorId, connector };
}
