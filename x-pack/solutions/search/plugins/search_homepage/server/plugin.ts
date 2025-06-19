/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import {
  PluginInitializerContext,
  CoreSetup,
  CoreStart,
  Plugin,
  Logger,
  IRouter,
} from '@kbn/core/server';
import type { SecurityPluginStart } from '@kbn/security-plugin/server';
import { SearchHomepagePluginStart, SearchHomepagePluginSetup } from './types';
import { defineRoutes } from './routes';

export interface RouteDependencies {
  http: CoreSetup<SearchHomepagePluginSetup>['http'];
  logger: Logger;
  router: IRouter;
  getSecurity: () => Promise<SecurityPluginStart>;
}
export class SearchHomepagePlugin
  implements Plugin<SearchHomepagePluginSetup, SearchHomepagePluginStart, {}, {}>
{
  private readonly logger: Logger;

  constructor(initializerContext: PluginInitializerContext) {
    this.logger = initializerContext.logger.get();
  }

  public setup(core: CoreSetup<{}, SearchHomepagePluginStart>) {
    this.logger.debug('searchHomepage: Setup');
    const router = core.http.createRouter();

    // Register server side APIs
    defineRoutes(router, this.logger);
    return {};
  }

  public start(core: CoreStart) {
    return {};
  }
}
