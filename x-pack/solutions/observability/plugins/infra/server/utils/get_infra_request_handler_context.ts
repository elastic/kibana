/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreRequestHandlerContext, KibanaRequest } from '@kbn/core/server';
import { DEFAULT_SPACE_ID } from '@kbn/spaces-plugin/common';
import type { InfraPluginRequestHandlerContext } from '../types';
import type { InfraServerPluginSetupDeps } from '../lib/adapters/framework';

export async function getInfraRequestHandlerContext({
  coreContext,
  request,
  plugins,
}: {
  coreContext: CoreRequestHandlerContext;
  request: KibanaRequest;
  plugins: InfraServerPluginSetupDeps;
}): Promise<InfraPluginRequestHandlerContext['infra']> {
  const savedObjectsClient = coreContext.savedObjects.client;
  const uiSettingsClient = coreContext.uiSettings.client;
  const metricsClient = plugins.metricsDataAccess.client;

  const mlSystem = plugins.ml?.mlSystemProvider(request, savedObjectsClient);
  const mlAnomalyDetectors = plugins.ml?.anomalyDetectorsProvider(request, savedObjectsClient);
  const spaceId = plugins.spaces?.spacesService.getSpaceId(request) ?? DEFAULT_SPACE_ID;

  const getMetricsIndices = async () => {
    return metricsClient.getMetricIndices({
      savedObjectsClient,
    });
  };

  return {
    mlAnomalyDetectors,
    mlSystem,
    spaceId,
    savedObjectsClient,
    uiSettingsClient,
    getMetricsIndices,
  };
}
