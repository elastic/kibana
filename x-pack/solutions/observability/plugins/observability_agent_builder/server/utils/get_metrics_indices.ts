/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest, Logger } from '@kbn/core/server';

import type {
  ObservabilityAgentBuilderCoreSetup,
  ObservabilityAgentBuilderPluginSetupDependencies,
} from '../types';

export async function getMetricsIndices({
  core,
  plugins,
  request,
  logger,
}: {
  core: ObservabilityAgentBuilderCoreSetup;
  plugins: ObservabilityAgentBuilderPluginSetupDependencies;
  request: KibanaRequest;
  logger: Logger;
}): Promise<string[]> {
  const [coreStart] = await core.getStartServices();
  const savedObjectsClient = coreStart.savedObjects.getScopedClient(request);

  try {
    const { metricsDataAccess } = plugins;
    const metricIndices = await metricsDataAccess.client.getMetricIndices({ savedObjectsClient });
    // getMetricIndices returns a comma-separated string, split it into an array
    return metricIndices.split(',').map((index) => index.trim());
  } catch (error) {
    logger.warn(`Failed to resolve metrics indices for Observability Agent: ${error.message}`);
    return ['metrics-*'];
  }
}
