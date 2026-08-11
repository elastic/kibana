/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/core/server';
import { SavedObjectsClient } from '@kbn/core/server';

import type {
  ObservabilityAgentBuilderCoreSetup,
  ObservabilityAgentBuilderPluginSetupDependencies,
} from '../types';

export async function getMetricsIndices({
  core,
  plugins,
  logger,
}: {
  core: ObservabilityAgentBuilderCoreSetup;
  plugins: ObservabilityAgentBuilderPluginSetupDependencies;
  logger: Logger;
}): Promise<string[]> {
  const [coreStart] = await core.getStartServices();
  const savedObjectsClient = new SavedObjectsClient(
    coreStart.savedObjects.createInternalRepository()
  );

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
