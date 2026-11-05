/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  CoreSetup,
  CoreStart,
  Logger,
  Plugin,
  PluginInitializerContext,
} from '@kbn/core/server';
import type { EntityStoreStartContract } from '@kbn/entity-store/server';
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

  constructor(initializerContext: PluginInitializerContext<EntityInventoryConfig>) {
    this.logger = initializerContext.logger.get();
  }

  public setup(
    _core: CoreSetup<EntityInventoryStartDependencies, EntityInventoryPluginStart>,
    _plugins: EntityInventorySetupDependencies
  ): EntityInventoryPluginSetup {
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
      const message = error instanceof Error ? error.message : String(error);
      this.logger.warn(`Entity inventory could not read the entity definitions: ${message}`);
    }
  };
}
