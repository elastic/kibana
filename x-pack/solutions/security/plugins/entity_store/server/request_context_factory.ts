/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreSetup } from '@kbn/core-lifecycle-server';
import type { Logger } from '@kbn/logging';
import type { TaskManagerStartContract } from '@kbn/task-manager-plugin/server';
import { DEFAULT_NAMESPACE_STRING } from '@kbn/core-saved-objects-utils-server';
import type { KibanaRequest } from '@kbn/core/server';
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
  request: KibanaRequest;
}

async function fetchPluginDepsForContext(
  core: CoreSetup<EntityStoreStartPlugins, void>,
  request: KibanaRequest
): Promise<{ taskManagerStart: TaskManagerStartContract; namespace: string }> {
  const [_, startPlugins] = await core.getStartServices();

  return {
    taskManagerStart: startPlugins.taskManager,
    namespace: startPlugins.spaces.spacesService.getSpaceId(request) || DEFAULT_NAMESPACE_STRING,
  };
}

export async function createRequestHandlerContext({
  logger,
  context,
  coreSetup,
  request,
}: EntityStoreApiRequestHandlerContextDeps): Promise<EntityStoreApiRequestHandlerContext> {
  const core = await context.core;
  const { taskManagerStart, namespace } = await fetchPluginDepsForContext(coreSetup, request);

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
  };
}
