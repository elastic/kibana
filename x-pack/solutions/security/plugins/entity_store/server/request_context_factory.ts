/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreSetup } from '@kbn/core-lifecycle-server';
import type { Logger } from '@kbn/logging';
import type { TaskManagerStartContract } from '@kbn/task-manager-plugin/server';
import type {
  EntityStoreApiRequestHandlerContext,
  EntityStoreRequestHandlerContext,
  EntityStoreStartPlugins,
} from './types';
import { AssetManager } from './domain/asset_manager';
import { FeatureFlags } from './infra/feature_flags';

interface EntityStoreApiRequestHandlerContextDeps {
  coreSetup: CoreSetup<EntityStoreStartPlugins, void>;
  context: Omit<EntityStoreRequestHandlerContext, 'entityStore'>;
  logger: Logger;
}

export async function getTaskManagerStart(
  core: CoreSetup<EntityStoreStartPlugins, void>
): Promise<TaskManagerStartContract> {
  const [, startPlugins] = await core.getStartServices();

  return startPlugins.taskManager;
}

export async function createRequestHandlerContext({
  logger,
  context,
  coreSetup,
}: EntityStoreApiRequestHandlerContextDeps): Promise<EntityStoreApiRequestHandlerContext> {
  const core = await context.core;
  const taskManagerStart = await getTaskManagerStart(coreSetup);

  return {
    core,
    logger,
    assetManager: new AssetManager(
      logger,
      core.elasticsearch.client.asCurrentUser,
      taskManagerStart
    ),
    featureFlags: new FeatureFlags(core.uiSettings.client),
  };
}
