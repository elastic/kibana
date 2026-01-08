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
import type { EntityStoreApiRequestHandlerContext, EntityStorePlugins } from './types';
import { ResourcesService } from './domain/resources_service';
import { ExtractEntityTask } from './tasks/extract_entity_task';

interface EntityStoreApiRequestHandlerContextDeps {
  core: CoreSetup;
  plugins: EntityStorePlugins;
  logger: Logger;
}

// this one seems bad, maybe Or knows a better way
export async function createEntityStoreDependencies({
  logger,
  core,
  plugins,
}: EntityStoreApiRequestHandlerContextDeps): Promise<
  Omit<EntityStoreApiRequestHandlerContext, 'core'>
> {
  const [, startPlugins] = await core.getStartServices();
  const taskManagerStart = (startPlugins as { taskManager: TaskManagerStartContract }).taskManager;
  const taskManagerSetup = plugins.taskManager;

  const getExtractEntitiesTask = memoize(
    () => new ExtractEntityTask(taskManagerStart, taskManagerSetup, logger)
  );

  return {
    getExtractEntitiesTask,
    getLogger: memoize(() => logger),
    getResourcesService: memoize(() => new ResourcesService(logger, getExtractEntitiesTask())),
  };
}
