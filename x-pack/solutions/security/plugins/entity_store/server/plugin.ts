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
import { registerEntityMaintainerTask } from './tasks/entity_maintainers';
import type { RegisterEntityMaintainerConfig } from './tasks/entity_maintainers/types';

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

    registerEntityMaintainerTask({
      taskManager: plugins.taskManager,
      logger: this.logger,
      config: {
        id: 'entity_maintainer_test1',
        interval: '30s',
        initialState: {
          chen: 'ashuri - 0',
        },
        run: async ({status}) => {
          this.logger.debug(` ==========> Running entity maintainer 1 state === ${JSON.stringify(status)}`);
          return {
            chen: `ashuri - ${status.state.chen === 'ashuri - 0' ? 1 : 0}`,
          };
        },
        setup: async ({status}) => {
          this.logger.debug(` ==========> Setting up entity maintainer 1 state === ${JSON.stringify(status)}`);
          return status.state;
        },
      },
      core,
    });

    registerEntityMaintainerTask({
      taskManager: plugins.taskManager,
      logger: this.logger,
      config: {
        id: 'entity_maintainer_test2',
        interval: '40s',
        initialState: {
          tal: 'ronen - 0',
        },
        run: async ({status}) => {
          this.logger.debug(` ==========> Running entity maintainer 2 state === ${JSON.stringify(status)}`);
          return {
            tal: `ronen - ${status.state.tal === 'ronen - 0' ? 1 : 0}`,
          };
        },
        setup: async ({status}) => {
          this.logger.debug(` ==========> Setting up entity maintainer 2 state === ${JSON.stringify(status)}`);
          return status.state;
        },
      },
      core,
    })
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
