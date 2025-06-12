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

import type { SearchIndicesPluginSetup, SearchIndicesPluginStart } from './types';
import { defineRoutes } from './routes';

export class SearchIndicesPlugin
  implements Plugin<SearchIndicesPluginSetup, SearchIndicesPluginStart>
{
  private readonly logger: Logger;

  constructor(initializerContext: PluginInitializerContext) {
    this.logger = initializerContext.logger.get();
  }

  public setup(core: CoreSetup) {
    this.logger.debug('searchIndices: Setup');
    const router = core.http.createRouter();

    // Register server side APIs
    defineRoutes(router, this.logger);

    return {};
  }

  public start(core: CoreStart) {
    this.logger.debug('searchIndices: Started');
    return {};
  }

  public stop() {}
}
