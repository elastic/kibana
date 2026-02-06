/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/core/server';
import { SavedObjectsClient } from '@kbn/core/server';

import type { ObservabilityAgentBuilderCoreSetup } from '../types';

export async function getLogsIndices({
  core,
  logger,
}: {
  core: ObservabilityAgentBuilderCoreSetup;
  logger: Logger;
}): Promise<string[]> {
  const [coreStart, pluginsStart] = await core.getStartServices();
  const savedObjectsClient = new SavedObjectsClient(
    coreStart.savedObjects.createInternalRepository()
  );

  try {
    const logsDataAccess = pluginsStart.logsDataAccess;
    const logSourcesService =
      await logsDataAccess.services.logSourcesServiceFactory.getLogSourcesService(
        savedObjectsClient
      );
    const logSources = await logSourcesService.getLogSources();
    return logSources.map(({ indexPattern }) => indexPattern);
  } catch (error) {
    logger.warn(`Failed to resolve logs indices for Observability Agent: ${error.message}`);
    return [];
  }
}
