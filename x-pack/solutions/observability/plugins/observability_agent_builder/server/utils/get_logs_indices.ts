/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest, Logger } from '@kbn/core/server';

import type { ObservabilityAgentBuilderCoreSetup } from '../types';

export async function getLogsIndices({
  core,
  request,
  logger,
}: {
  core: ObservabilityAgentBuilderCoreSetup;
  request: KibanaRequest;
  logger: Logger;
}): Promise<string[]> {
  const [, pluginsStart] = await core.getStartServices();

  try {
    const logsDataAccess = pluginsStart.logsDataAccess;
    const logSourcesService =
      await logsDataAccess.services.logSourcesServiceFactory.getScopedLogSourcesService(request);

    const logSources = await logSourcesService.getLogSources();
    return logSources.map(({ indexPattern }) => indexPattern);
  } catch (error) {
    logger.warn(`Failed to resolve logs indices for Observability Agent: ${error.message}`);
    return [];
  }
}
