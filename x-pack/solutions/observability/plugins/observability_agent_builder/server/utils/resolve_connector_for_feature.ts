/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest } from '@kbn/core-http-server';
import type { CoreStart, Logger } from '@kbn/core/server';
import type { InferenceConnector } from '@kbn/inference-common';
import type { InferenceServerStart } from '@kbn/inference-plugin/server';
import type { SearchInferenceEndpointsPluginStart } from '@kbn/search-inference-endpoints/server';
import { getDefaultConnectorId } from './get_default_connector_id';

export async function resolveConnectorForFeature({
  searchInferenceEndpoints,
  featureId,
  request,
  logger,
  coreStart,
  inference,
}: {
  searchInferenceEndpoints?: SearchInferenceEndpointsPluginStart;
  featureId: string;
  request: KibanaRequest;
  logger: Logger;
  coreStart: CoreStart;
  inference: InferenceServerStart;
}): Promise<{ connectorId: string; connector: InferenceConnector }> {
  const resolved = await searchInferenceEndpoints?.endpoints.getForFeature(featureId, request);
  resolved?.warnings.forEach((w) => logger.warn(w));

  if (resolved && resolved.endpoints.length > 0) {
    const connector = resolved.endpoints[0];
    return { connectorId: connector.connectorId, connector };
  }

  const connectorId = await getDefaultConnectorId({ coreStart, inference, request, logger });
  const connector = await inference.getConnectorById(connectorId, request);
  return { connectorId, connector };
}
