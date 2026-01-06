/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { TaskManagerSetupContract, TaskManagerStartContract } from '@kbn/task-manager-plugin/server';
import type { CoreRequestHandlerContext, CustomRequestHandlerContext} from '@kbn/core-http-request-handler-context-server';
import type { IRouter } from '@kbn/core-http-server';
import type { Logger } from '@kbn/logging';
import type { ResourcesService } from './domain/resources_service';

export type TaskManager = TaskManagerSetupContract & TaskManagerStartContract;

export interface EntityStorePlugins {
  taskManager: TaskManager;
};

export interface EntityStoreApiRequestHandlerContext {
  core: CoreRequestHandlerContext;
  getResourcesService: () => ResourcesService;
  getLogger: () => Logger;
  getTaskManager: () => Promise<TaskManager>;
}

export type EntityStoreRequestHandlerContext = CustomRequestHandlerContext<{
  entityStore: EntityStoreApiRequestHandlerContext;
}>;

export type EntityStorePluginRouter = IRouter<EntityStoreRequestHandlerContext>;
