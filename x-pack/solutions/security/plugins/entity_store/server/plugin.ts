/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PluginInitializerContext, CoreStart, Plugin, Logger } from '@kbn/core/server';
import { registerRoutes } from './routes';
import type {
  EntityStoreCoreSetup,
  EntityStoreRequestHandlerContext,
  EntityStoreSetupPlugins,
  EntityStoreStartPlugins,
  EntityStoreStartContract,
  EntityStoreSetupContract,
} from './types';
import { createRequestHandlerContext } from './request_context_factory';
import { PLUGIN_ID } from '../common';
import { registerTasks } from './tasks/register_tasks';
import { registerUiSettings } from './infra/feature_flags/register';
import { EngineDescriptorType } from './domain/definitions/saved_objects';
import { registerEntityMaintainerTask } from './tasks/entity_maintainer';
import type { RegisterEntityMaintainerConfig } from './tasks/entity_maintainer/types';

export class EntityStorePlugin
  implements
    Plugin<
      EntityStoreSetupContract,
      EntityStoreStartContract,
      EntityStoreSetupPlugins,
      EntityStoreStartPlugins
    >
{
  private readonly logger: Logger;
  private readonly isServerless: boolean;

  constructor(initializerContext: PluginInitializerContext) {
    this.logger = initializerContext.logger.get();
    this.isServerless = initializerContext.env.packageInfo.buildFlavor === 'serverless';
  }

  public setup(
    core: EntityStoreCoreSetup,
    plugins: EntityStoreSetupPlugins
  ): EntityStoreSetupContract {
    plugins.taskManager.registerCanEncryptedSavedObjects(plugins.encryptedSavedObjects.canEncrypt);

    const router = core.http.createRouter<EntityStoreRequestHandlerContext>();
    core.http.registerRouteHandlerContext<EntityStoreRequestHandlerContext, typeof PLUGIN_ID>(
      PLUGIN_ID,
      (context, request) =>
        createRequestHandlerContext({
          context,
          coreSetup: core,
          logger: this.logger,
          request,
          isServerless: this.isServerless,
        })
    );

    registerTasks(plugins.taskManager, this.logger, core);
    this.logger.debug('Registering routes');
    registerRoutes(router);

    this.logger.debug('Registering ui settings');
    registerUiSettings(core.uiSettings);

    this.logger.debug('Registering saved objects types');
    core.savedObjects.registerType(EngineDescriptorType);

    return {
      registerEntityMaintainer: (config: RegisterEntityMaintainerConfig) =>
        registerEntityMaintainerTask({
          taskManager: plugins.taskManager,
          logger: this.logger,
          config,
          core,
        }),
    };
  }

  public start(core: CoreStart, plugins: EntityStoreStartPlugins): EntityStoreStartContract {
    this.logger.info('Initializing plugin');

    plugins.taskManager.registerEncryptedSavedObjectsClient(
      plugins.encryptedSavedObjects.getClient({
        includedHiddenTypes: ['task'],
      })
    );

    plugins.taskManager.registerApiKeyInvalidateFn(
      plugins.security?.authc.apiKeys.invalidateAsInternalUser
    );
  }

  public stop() {
    this.logger.info('Stopping plugin');
  }
}
