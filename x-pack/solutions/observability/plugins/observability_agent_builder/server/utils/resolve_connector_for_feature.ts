/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest } from '@kbn/core-http-server';
import type { Logger } from '@kbn/core/server';
import type { InferenceConnector } from '@kbn/inference-common';
import type { SearchInferenceEndpointsPluginStart } from '@kbn/search-inference-endpoints/server';

export async function resolveConnectorForFeature({
  searchInferenceEndpoints,
  featureId,
  request,
  logger,
}: {
  searchInferenceEndpoints: SearchInferenceEndpointsPluginStart;
  featureId: string;
  request: KibanaRequest;
  logger: Logger;
}): Promise<{ connectorId: string; connector: InferenceConnector }> {
  const resolved = await searchInferenceEndpoints.endpoints.getForFeature(featureId, request);
  resolved.warnings.forEach((w) => logger.warn(w));

  if (resolved.endpoints.length > 0) {
    const connector = resolved.endpoints[0];
    return { connectorId: connector.connectorId, connector };
  }

  throw new Error(
    `No connector configured for feature "${featureId}". Configure one in Stack Management > Feature Settings.`
  );
}
