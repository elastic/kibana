/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PluginInitializerContext, CoreSetup, Plugin, Logger } from '@kbn/core/server';
import { registerRoutes } from './routes';
import type { EntityStoreRequestHandlerContext } from './types';
import { createEntityStoreDependencies } from './request_context_factory';
import { PLUGIN_ID } from '../common';
import type { EntityStorePlugins } from './types';
import { registerTasks } from './tasks/register_tasks';

export class EntityStorePlugin implements Plugin {
  private readonly logger: Logger;

  constructor(initializerContext: PluginInitializerContext) {
    this.logger = initializerContext.logger.get();
  }

  public async setup(core: CoreSetup, plugins: EntityStorePlugins) {
    const deps = await createEntityStoreDependencies({ core, logger: this.logger, plugins });

    const router = core.http.createRouter<EntityStoreRequestHandlerContext>();
    core.http.registerRouteHandlerContext<EntityStoreRequestHandlerContext, typeof PLUGIN_ID>(
      PLUGIN_ID,
      async (context, _request) => {
        const coreContext = await context.core;
        return {
          core: coreContext,
          ...deps,
        };
      }
    );

    registerTasks(deps);
    registerRoutes(router);
  }

  public start() {
    this.logger.info('Initializing plugin');
  }

  public stop() {
    this.logger.info('Stopping plugin');
  }
}
