/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PluginInitializerContext, CoreSetup, CoreStart, Plugin } from '@kbn/core/server';
import { registerRoutes } from './routes';
import type { EntityStoreDependencies } from './dependencies';
import { initDependencies } from './dependencies';
import type { EntityStorePlugins } from './types';
export class EntityStorePlugin implements Plugin {
  private readonly dependencies: EntityStoreDependencies;

  constructor(initializerContext: PluginInitializerContext) {
    this.dependencies = initDependencies(initializerContext);
  }

  setup(core: CoreSetup, plugins: EntityStorePlugins) {
    const router = core.http.createRouter();

    registerRoutes(router, this.dependencies, plugins);
  }

  start(core: CoreStart, plugins: EntityStorePlugins) {
    this.dependencies.logger.info('Initializing plugin');
  }

  stop() {
    this.dependencies.logger.info('Stopping plugin');
  }
}
