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

import { SearchNotebooksConfig } from './config';
import { defineRoutes } from './routes';
import { SearchNotebooksPluginSetup, SearchNotebooksPluginStart, NotebooksCache } from './types';
import { createNotebooksCache } from './utils';

export class SearchNotebooksPlugin
  implements Plugin<SearchNotebooksPluginSetup, SearchNotebooksPluginStart>
{
  private readonly config: SearchNotebooksConfig;
  private readonly logger: Logger;
  private readonly notebooksCache: NotebooksCache;

  constructor(initializerContext: PluginInitializerContext) {
    this.config = initializerContext.config.get<SearchNotebooksConfig>();
    this.logger = initializerContext.logger.get();
    this.notebooksCache = createNotebooksCache();
  }

  public setup(core: CoreSetup) {
    if (!this.config.enabled) return {};

    this.logger.debug('searchNotebooks: Setup');
    const router = core.http.createRouter();

    // Register server side APIs
    defineRoutes({
      config: this.config,
      logger: this.logger,
      notebooksCache: this.notebooksCache,
      router,
    });

    return {};
  }

  public start(core: CoreStart) {
    return {};
  }

  public stop() {}
}
