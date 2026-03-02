/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/logging';
import type { KibanaRequest } from '@kbn/core/server';
import type {
  EntityStoreApiRequestHandlerContext,
  EntityStoreCoreSetup,
  EntityStoreRequestHandlerContext,
} from './types';
import { AssetManager } from './domain/asset_manager';
import { FeatureFlags } from './infra/feature_flags';
import { EngineDescriptorClient } from './domain/definitions/saved_objects';
import { CcsLogsExtractionClient } from './domain/ccs_logs_extraction_client';
import { LogsExtractionClient } from './domain/logs_extraction_client';
import { CRUDClient } from './domain/crud_client';
import type { TelemetryReporter } from './telemetry/events';

interface EntityStoreApiRequestHandlerContextDeps {
  coreSetup: EntityStoreCoreSetup;
  context: Omit<EntityStoreRequestHandlerContext, 'entityStore'>;
  logger: Logger;
  request: KibanaRequest;
  isServerless: boolean;
  analytics: TelemetryReporter;
}

export async function createRequestHandlerContext({
  logger,
  context,
  coreSetup,
  request,
  isServerless,
  analytics,
}: EntityStoreApiRequestHandlerContextDeps): Promise<EntityStoreApiRequestHandlerContext> {
  const core = await context.core;
  const [, startPlugins] = await coreSetup.getStartServices();
  const taskManagerStart = startPlugins.taskManager;
  const namespace = startPlugins.spaces.spacesService.getSpaceId(request);

  const dataViewsService = await startPlugins.dataViews.dataViewsServiceFactory(
    core.savedObjects.client,
    core.elasticsearch.client.asInternalUser,
    request
  );

  const engineDescriptorClient = new EngineDescriptorClient(
    core.savedObjects.client,
    namespace,
    logger
  );

  const esClient = core.elasticsearch.client.asCurrentUser;
  const crudClient = new CRUDClient({
    logger,
    esClient,
    namespace,
  });
  const ccsLogsExtractionClient = new CcsLogsExtractionClient(logger, esClient, crudClient);
  const logsExtractionClient = new LogsExtractionClient({
    logger,
    namespace,
    esClient,
    dataViewsService,
    engineDescriptorClient,
    ccsLogsExtractionClient,
  });

  return {
    core,
    logger,
    assetManager: new AssetManager({
      logger,
      esClient: core.elasticsearch.client.asCurrentUser,
      taskManager: taskManagerStart,
      engineDescriptorClient,
      namespace,
      isServerless,
      logsExtractionClient,
      security: startPlugins.security,
      analytics,
    }),
    crudClient,
    ccsLogsExtractionClient,
    featureFlags: new FeatureFlags(core.uiSettings.client),
    logsExtractionClient,
    security: startPlugins.security,
    namespace,
  };
}
