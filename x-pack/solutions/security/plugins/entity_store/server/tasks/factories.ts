/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/logging';
import type { KibanaRequest } from '@kbn/core/server';
import type { EntityStoreCoreSetup } from '../types';
import { LogsExtractionClient } from '../domain/logs_extraction';
import { CcsLogsExtractionClient } from '../domain/logs_extraction';
import { EngineDescriptorClient, EntityStoreGlobalStateClient } from '../domain/saved_objects';

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

  // TODO [CPS routing]: this client currently preserves the existing "origin-only" behavior.
  //   Review and choose one of the following options:
  //   A) Still unsure? Leave this comment as-is.
  //   B) Confirmed origin-only is correct? Replace this TODO with a concise explanation of why.
  //   C) Want to use current space’s NPRE (Named Project Routing Expression)? Change 'origin-only' to 'space' and remove this comment.
  //      Note: 'space' requires the request passed to asScoped() to carry a `url: URL` property.
  const clusterClient = coreStart.elasticsearch.client.asScoped(fakeRequest, { projectRouting: 'origin-only' });
  const soClient = coreStart.savedObjects.getScopedClient(fakeRequest);
  const internalUserClient = coreStart.elasticsearch.client.asInternalUser;

  const dataViewsService = await pluginsStart.dataViews.dataViewsServiceFactory(
    soClient,
    internalUserClient
  );

  const esClient = clusterClient.asCurrentUser;
  const ccsLogsExtractionClient = new CcsLogsExtractionClient(logger, esClient, namespace);

  const logsExtractionClient = new LogsExtractionClient({
    logger,
    namespace,
    esClient,
    dataViewsService,
    engineDescriptorClient: new EngineDescriptorClient(soClient, namespace, logger),
    globalStateClient: new EntityStoreGlobalStateClient(soClient, namespace, logger),
    ccsLogsExtractionClient,
  });

  return {
    logsExtractionClient,
  };
}
