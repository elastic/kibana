/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { memoize } from 'lodash';
import type { CoreSetup } from '@kbn/core-lifecycle-server';
import type { Logger } from '@kbn/logging';
import type {
  EntityStoreApiRequestHandlerContext,
  EntityStoreRequestHandlerContext,
  EntityStoreStartPlugins,
} from './types';
import { ResourcesService } from './domain/resources_service';
import { FeatureFlags } from './infra/feature_flags';
import { TaskManagerStartContract } from '@kbn/task-manager-plugin/server';

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
  coreSetup
}: EntityStoreApiRequestHandlerContextDeps): Promise<EntityStoreApiRequestHandlerContext> {
  const core = await context.core;
  return {
    core,
    logger,
    resourcesService: new ResourcesService(logger),
    featureFlags: new FeatureFlags(core.uiSettings.client),
    taskManagerStart: await getTaskManagerStart(coreSetup),
  };
}
