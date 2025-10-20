/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreSetup, Logger } from '@kbn/core/server';
import { SavedObjectsClient } from '@kbn/core/server';

import type { APMIndices } from '@kbn/apm-sources-access-plugin/server';
import type {
  ObservabilityAgentPluginSetupDependencies,
  ObservabilityAgentPluginStart,
  ObservabilityAgentPluginStartDependencies,
} from '../types';

export async function getApmIndices({
  core,
  plugins,
  logger,
}: {
  core: CoreSetup<ObservabilityAgentPluginStartDependencies, ObservabilityAgentPluginStart>;
  plugins: ObservabilityAgentPluginSetupDependencies;
  logger: Logger;
}): Promise<APMIndices> {
  const [coreStart] = await core.getStartServices();
  const savedObjectsClient = new SavedObjectsClient(
    coreStart.savedObjects.createInternalRepository()
  );

  try {
    return plugins.apmDataAccess.getApmIndices(savedObjectsClient);
  } catch (error) {
    logger.warn(`Failed to resolve APM indices for Observability Agent: ${error.message}`);
    throw error;
  }
}
