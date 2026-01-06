/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { memoize } from 'lodash';
import type { CoreSetup } from '@kbn/core-lifecycle-server';
import type { Logger } from '@kbn/logging';
import type { TaskManagerStartContract } from '@kbn/task-manager-plugin/server';
import type {
  EntityStoreApiRequestHandlerContext,
  EntityStorePlugins,
  EntityStoreRequestHandlerContext,
  TaskManager,
} from './types';
import { ResourcesService } from './domain/resources_service';

interface EntityStoreApiRequestHandlerContextDeps {
  core: CoreSetup;
  plugins: EntityStorePlugins;
  context: Omit<EntityStoreRequestHandlerContext, 'entityStore'>;
  logger: Logger;
}

async function getTaskManager(
  core: CoreSetup,
  setupPlugins: EntityStorePlugins
): Promise<TaskManager> {
  const [, startPlugins] = await core.getStartServices();
  const taskManagerStart = (startPlugins as { taskManager: TaskManagerStartContract }).taskManager;
  const taskManagerSetup = setupPlugins.taskManager;

  return {
    ...taskManagerSetup,
    ...taskManagerStart,
  };
}

export async function createRequestHandlerContext({
  logger,
  context,
  core,
  plugins,
}: EntityStoreApiRequestHandlerContextDeps): Promise<EntityStoreApiRequestHandlerContext> {
  const coreCtx = await context.core;

  return {
    core: coreCtx,
    getLogger: memoize(() => logger),
    getResourcesService: memoize(
      async () => new ResourcesService(logger, await getTaskManager(core, plugins))
    ),
  };
}
