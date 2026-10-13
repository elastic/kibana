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
import type { EntityInventoryConfig } from './config';
import type {
  EntityInventoryPluginSetup,
  EntityInventoryPluginStart,
  EntityInventorySetupDependencies,
  EntityInventoryStartDependencies,
} from './types';

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
    _plugins: EntityInventoryStartDependencies
  ): EntityInventoryPluginStart {}

  public stop(): void {}
}
