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
  EntityStorePlugins,
  EntityStoreRequestHandlerContext,
} from './types';
import { ResourcesService } from './domain/resources_service';
import { getTaskManagers } from './tasks/task_manager';

interface EntityStoreApiRequestHandlerContextDeps {
  core: CoreSetup;
  plugins: EntityStorePlugins;
  context: Omit<EntityStoreRequestHandlerContext, 'entityStore'>;
  logger: Logger;
}

export async function createRequestHandlerContext({
  logger,
  context,
  core,
  plugins,
}: EntityStoreApiRequestHandlerContextDeps): Promise<EntityStoreApiRequestHandlerContext> {
  const coreCtx = await context.core;
  const taskManagers = await getTaskManagers(core, plugins);

  return {
    core: coreCtx,
    getLogger: memoize(() => logger),
    getResourcesService: memoize(() => new ResourcesService(logger)),
    getTaskManagers: memoize(() => taskManagers),
  };
}
