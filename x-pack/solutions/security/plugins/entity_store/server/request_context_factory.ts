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
import { AssetManagerClient } from './domain/asset_manager/asset_manager_client';
import { EntityMaintainersClient } from './domain/entity_maintainers';
import { FeatureFlags } from './infra/feature_flags';
import {
  EngineDescriptorClient,
  EntityStoreGlobalStateClient,
} from './domain/definitions/saved_objects';
import { CcsLogsExtractionClient, LogsExtractionClient } from './domain/logs_extraction';
import { HistorySnapshotClient } from './domain/history_snapshot';
import { CRUDClient } from './domain/crud';
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

  const globalStateClient = new EntityStoreGlobalStateClient(
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
    globalStateClient,
    ccsLogsExtractionClient,
  });

  const historySnapshotClient = new HistorySnapshotClient({
    logger,
    esClient,
    namespace,
    globalStateClient,
  });

  return {
    core,
    logger,
    assetManagerClient: new AssetManagerClient({
      logger,
      esClient: core.elasticsearch.client.asCurrentUser,
      taskManager: taskManagerStart,
      engineDescriptorClient,
      globalStateClient,
      namespace,
      isServerless,
      logsExtractionClient,
      security: startPlugins.security,
      analytics,
    }),
    entityMaintainersClient: new EntityMaintainersClient({
      logger,
      taskManager: taskManagerStart,
      namespace,
    }),
    crudClient,
    ccsLogsExtractionClient,
    featureFlags: new FeatureFlags(core.uiSettings.client),
    logsExtractionClient,
    historySnapshotClient,
    security: startPlugins.security,
    namespace,
  };
}
