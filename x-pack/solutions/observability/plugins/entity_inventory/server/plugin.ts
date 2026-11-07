/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  CoreSetup,
  CoreStart,
  KibanaRequest,
  Logger,
  Plugin,
  PluginInitializerContext,
} from '@kbn/core/server';
import type { EntityStoreStartContract } from '@kbn/entity-store/server';
import { registerRoutes } from '@kbn/server-route-repository';
import { InventoryService } from './service/inventory_service';
import { entityInventoryRouteRepository } from './routes';
import type { EntityInventoryConfig } from './config';
import type {
  EntityInventoryPluginSetup,
  EntityInventoryPluginStart,
  EntityInventorySetupDependencies,
  EntityInventoryStartDependencies,
} from './types';

const DEFAULT_SPACE_ID = 'default';

export class EntityInventoryPlugin
  implements
    Plugin<
      EntityInventoryPluginSetup,
      EntityInventoryPluginStart,
      EntityInventorySetupDependencies,
      EntityInventoryStartDependencies
    >
{
  private readonly logger: Logger;
  private readonly isDev: boolean;

  constructor(initializerContext: PluginInitializerContext<EntityInventoryConfig>) {
    this.logger = initializerContext.logger.get();
    this.isDev = initializerContext.env.mode.dev;
  }

  public setup(
    core: CoreSetup<EntityInventoryStartDependencies, EntityInventoryPluginStart>,
    _plugins: EntityInventorySetupDependencies
  ): EntityInventoryPluginSetup {
    registerRoutes({
      repository: entityInventoryRouteRepository,
      dependencies: { getInventoryService: this.createInventoryService(core) },
      core,
      logger: this.logger,
      runDevModeChecks: this.isDev,
    });
    this.logger.debug('Entity inventory plugin set up');
  }

  public start(
    _core: CoreStart,
    { entityStore }: EntityInventoryStartDependencies
  ): EntityInventoryPluginStart {
    // Not awaited: an async start lifecycle is deprecated in core and would hold up Kibana startup.
    void this.logRegisteredEntityDefinitions(entityStore);
  }

  public stop(): void {}

  /**
   * Builds an `InventoryService` over the request-scoped entity definitions client, which resolves
   * the request's space itself, and an Elasticsearch client that queries as the requesting user.
   */
  private createInventoryService =
    (core: CoreSetup<EntityInventoryStartDependencies, EntityInventoryPluginStart>) =>
    async (request: KibanaRequest): Promise<InventoryService> => {
      const [coreStart, { entityStore }] = await core.getStartServices();
      return new InventoryService(
        entityStore.getEntityDefinitionsClient(request),
        coreStart.elasticsearch.client.asScoped(request).asCurrentUser,
        this.logger
      );
    };

  private logRegisteredEntityDefinitions = async (
    entityStore: EntityStoreStartContract
  ): Promise<void> => {
    try {
      // Code-registered definitions are global, so the space does not matter here.
      const definitions = await entityStore
        .getEntityDefinitionsClientForSpace(DEFAULT_SPACE_ID)
        .list();
      const typeNames = definitions.map(({ type }) => type);
      this.logger.info(
        `Entity inventory found ${typeNames.length} entity definitions: ${typeNames.join(', ')}`
      );
    } catch (error) {
      this.logger.warn(`Entity inventory could not read the entity definitions: ${error.message}`);
    }
  };
}
