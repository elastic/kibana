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
  DEFAULT_APP_CATEGORIES,
} from '@kbn/core/server';

import { KibanaFeatureScope } from '@kbn/features-plugin/common';
import {
  SearchSynonymsPluginSetup,
  SearchSynonymsPluginSetupDependencies,
  SearchSynonymsPluginStart,
} from './types';

import { defineRoutes } from './routes';
import { PLUGIN_ID, PLUGIN_TITLE } from '../common';

export class SearchSynonymsPlugin
  implements Plugin<SearchSynonymsPluginSetup, SearchSynonymsPluginStart, {}, {}>
{
  private readonly logger: Logger;

  constructor(initializerContext: PluginInitializerContext) {
    this.logger = initializerContext.logger.get();
  }

  public setup(core: CoreSetup, plugins: SearchSynonymsPluginSetupDependencies) {
    const router = core.http.createRouter();

    defineRoutes({ router, logger: this.logger });

    plugins.features.registerKibanaFeature({
      id: PLUGIN_ID,
      name: PLUGIN_TITLE,
      order: 0,
      category: DEFAULT_APP_CATEGORIES.enterpriseSearch,
      app: ['kibana', PLUGIN_ID],
      scope: [KibanaFeatureScope.Spaces, KibanaFeatureScope.Security],
      catalogue: [PLUGIN_ID],
      privileges: {
        all: {
          app: ['kibana', PLUGIN_ID],
          api: ['manage_synonyms'],
          catalogue: [PLUGIN_ID],
          savedObject: {
            all: [],
            read: [],
          },
          ui: ['manage'],
        },
        read: {
          disabled: true,
          savedObject: {
            all: [],
            read: [],
          },
          ui: [],
        },
      },
    });

    return {};
  }

  public start(_: CoreStart) {
    return {};
  }

  public stop() {}
}
