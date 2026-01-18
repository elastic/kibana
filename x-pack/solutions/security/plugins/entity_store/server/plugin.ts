/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  PluginInitializerContext,
  CoreSetup,
  CoreStart,
  Plugin,
  Logger,
} from '@kbn/core/server';
import { registerRoutes } from './routes';
import type {
  EntityStoreRequestHandlerContext,
  EntityStoreSetupPlugins,
  EntityStoreStartPlugins,
  PluginStartContract,
  PluginSetupContract,
} from './types';
import { createRequestHandlerContext } from './request_context_factory';
import { PLUGIN_ID } from '../common';
import { registerTasks } from './tasks/register_tasks';
import { registerUiSettings } from './infra/feature_flags/register';
import { installComponentTemplates } from './domain/assets_manager';

export class EntityStorePlugin
  implements
    Plugin<
      PluginSetupContract,
      PluginStartContract,
      EntityStoreSetupPlugins,
      EntityStoreStartPlugins
    >
{
  private readonly logger: Logger;

  constructor(initializerContext: PluginInitializerContext) {
    this.logger = initializerContext.logger.get();
  }

  public setup(core: CoreSetup<EntityStoreStartPlugins, void>, plugins: EntityStoreSetupPlugins) {
    const router = core.http.createRouter<EntityStoreRequestHandlerContext>();
    core.http.registerRouteHandlerContext<EntityStoreRequestHandlerContext, typeof PLUGIN_ID>(
      PLUGIN_ID,
      (context, request) =>
        createRequestHandlerContext({ context, coreSetup: core, logger: this.logger })
    );

    registerTasks(plugins.taskManager, this.logger, core);
    this.logger.debug('Registering routes');
    registerRoutes(router);

    this.logger.debug('Registering ui settings');
    registerUiSettings(core.uiSettings);
  }

  public start(core: CoreStart, plugins: EntityStoreStartPlugins) {
    this.logger.info('Initializing plugin');
    this.logger.debug('installing component templates');

    // TODO: install entity latest index templates and index

    installComponentTemplates({
      esClient: core.elasticsearch.client.asInternalUser,
    })
      .then(() => {
        this.logger.debug('installed component templates');
      })
      .catch((error) => {
        this.logger.error(`Error installing component templates: ${error}`);
      });
  }

  public stop() {
    this.logger.info('Stopping plugin');
  }
}
