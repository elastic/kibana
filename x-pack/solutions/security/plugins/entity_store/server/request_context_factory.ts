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
import { ResourcesService } from './domain/resources_service';

interface EntityStoreApiRequestHandlerContextDeps {
  core: CoreSetup<EntityStoreStartPlugins, void>;
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
  core,
}: EntityStoreApiRequestHandlerContextDeps): Promise<EntityStoreApiRequestHandlerContext> {
  return {
    core: await context.core,
    logger,
    resourcesService: new ResourcesService(logger),
    taskManagerStart: await getTaskManagerStart(core),
  };
}
