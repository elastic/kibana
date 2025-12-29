/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PluginInitializerContext, CoreSetup, Plugin } from '@kbn/core/server';
import { registerRoutes } from './routes';
import type { EntityStoreDependencies } from './dependencies';
import { initDependencies } from './dependencies';

export class EntityStorePlugin implements Plugin {
  private readonly dependencies: EntityStoreDependencies;

  constructor(initializerContext: PluginInitializerContext) {
    this.dependencies = initDependencies(initializerContext);
  }

  public setup(core: CoreSetup) {
    const router = core.http.createRouter();

    registerRoutes(router, this.dependencies);
  }

  public start() {
    this.dependencies.logger.info('Initializing plugin');
  }

  public stop() {
    this.dependencies.logger.info('Stopping plugin');
  }
}
