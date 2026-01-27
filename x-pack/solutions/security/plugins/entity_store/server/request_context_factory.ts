/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreSetup } from '@kbn/core-lifecycle-server';
import type { Logger } from '@kbn/logging';
import type { KibanaRequest } from '@kbn/core/server';
import type {
  EntityStoreApiRequestHandlerContext,
  EntityStoreRequestHandlerContext,
  EntityStoreStartPlugins,
} from './types';
import { AssetManager } from './domain/asset_manager';
import { FeatureFlags } from './infra/feature_flags';
import { LogsExtractionClient } from './domain/logs_extraction_client';

interface EntityStoreApiRequestHandlerContextDeps {
  coreSetup: CoreSetup<EntityStoreStartPlugins, void>;
  context: Omit<EntityStoreRequestHandlerContext, 'entityStore'>;
  logger: Logger;
  request: KibanaRequest;
}

export async function createRequestHandlerContext({
  logger,
  context,
  coreSetup,
  request,
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

  return {
    core,
    logger,
    assetManager: new AssetManager(
      logger,
      core.elasticsearch.client.asCurrentUser,
      taskManagerStart,
      namespace
    ),
    featureFlags: new FeatureFlags(core.uiSettings.client),
    logsExtractionClient: new LogsExtractionClient(
      logger,
      namespace,
      core.elasticsearch.client.asCurrentUser,
      dataViewsService
    ),
  };
}
