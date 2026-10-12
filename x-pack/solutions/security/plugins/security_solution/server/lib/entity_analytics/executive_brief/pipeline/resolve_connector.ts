/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest, Logger } from '@kbn/core/server';
import type { InferenceServerStart } from '@kbn/inference-plugin/server';
import type { SearchInferenceEndpointsPluginStart } from '@kbn/search-inference-endpoints/server';
import { EXECUTIVE_BRIEF_INFERENCE_FEATURE_ID } from '../../../../../common/entity_analytics/executive_brief/constants';

export interface ResolveConnectorParams {
  /** From the request body; validated against the inference plugin when given. */
  connectorId?: string;
  request: KibanaRequest;
  inference: Pick<InferenceServerStart, 'getConnectorById' | 'getDefaultConnector'>;
  searchInferenceEndpoints?: Pick<SearchInferenceEndpointsPluginStart, 'endpoints'>;
  logger: Logger;
}

export type ResolveConnectorResult =
  | { connectorId: string }
  | { connectorId: undefined; reason: 'not_found' | 'none_configured'; message: string };

/**
 * Resolves the connector for a brief: the requested connector (which must exist), else the
 * executive brief inference feature's configured endpoint, else the default connector.
 */
export const resolveConnector = async ({
  connectorId,
  request,
  inference,
  searchInferenceEndpoints,
  logger,
}: ResolveConnectorParams): Promise<ResolveConnectorResult> => {
  if (connectorId) {
    try {
      const connector = await inference.getConnectorById(connectorId, request);
      return { connectorId: connector.connectorId };
    } catch (error) {
      return {
        connectorId: undefined,
        reason: 'not_found',
        message: `Connector ${connectorId} is not available: ${
          error instanceof Error ? error.message : String(error)
        }`,
      };
    }
  }

  if (searchInferenceEndpoints) {
    try {
      const { endpoints } = await searchInferenceEndpoints.endpoints.getForFeature(
        EXECUTIVE_BRIEF_INFERENCE_FEATURE_ID,
        request
      );
      const [first] = endpoints;
      if (first) {
        return { connectorId: first.connectorId };
      }
    } catch (error) {
      logger.debug(
        `Could not resolve a connector for ${EXECUTIVE_BRIEF_INFERENCE_FEATURE_ID}: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    }
  }

  const defaultConnector = await inference.getDefaultConnector(request);
  if (defaultConnector) {
    return { connectorId: defaultConnector.connectorId };
  }

  return {
    connectorId: undefined,
    reason: 'none_configured',
    message: 'No AI connector is configured. Configure a connector to generate a brief.',
  };
};
