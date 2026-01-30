/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/logging';
import type { KibanaRequest } from '@kbn/core/server';
import type { EntityStoreCoreSetup } from '../types';
import { LogsExtractionClient } from '../domain/logs_extraction_client';
import { EngineDescriptorClient } from '../domain/definitions/saved_objects';

export interface LogsExtractionClientFactoryResult {
  logsExtractionClient: LogsExtractionClient;
}

export async function createLogsExtractionClient({
  core,
  fakeRequest,
  logger,
  namespace,
}: {
  core: EntityStoreCoreSetup;
  logger: Logger;
  namespace: string;
  fakeRequest: KibanaRequest;
}): Promise<LogsExtractionClientFactoryResult> {
  const [coreStart, pluginsStart] = await core.getStartServices();

  const clusterClient = coreStart.elasticsearch.client.asScoped(fakeRequest);
  const soClient = coreStart.savedObjects.getScopedClient(fakeRequest);
  const internalUserClient = coreStart.elasticsearch.client.asInternalUser;

  const dataViewsService = await pluginsStart.dataViews.dataViewsServiceFactory(
    soClient,
    internalUserClient
  );

  const logsExtractionClient = new LogsExtractionClient(
    logger,
    namespace,
    clusterClient.asCurrentUser,
    dataViewsService,
    new EngineDescriptorClient(soClient, namespace, logger)
  );

  return {
    logsExtractionClient,
  };
}
