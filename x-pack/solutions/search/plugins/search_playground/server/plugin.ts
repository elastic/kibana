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

import { sendMessageEvent } from './analytics/events';
import {
  SearchPlaygroundPluginSetup,
  SearchPlaygroundPluginSetupDependencies,
  SearchPlaygroundPluginStart,
  SearchPlaygroundPluginStartDependencies,
} from './types';
import { defineRoutes } from './routes';
import { PLUGIN_ID, PLUGIN_NAME, PLAYGROUND_SAVED_OBJECT_TYPE } from '../common';
import { createPlaygroundSavedObjectType } from './playground_saved_object/playground_saved_object';

export class SearchPlaygroundPlugin
  implements
    Plugin<
      SearchPlaygroundPluginSetup,
      SearchPlaygroundPluginStart,
      {},
      SearchPlaygroundPluginStartDependencies
    >
{
  private readonly logger: Logger;

  constructor(initializerContext: PluginInitializerContext) {
    this.logger = initializerContext.logger.get();
  }

  public setup(
    core: CoreSetup<SearchPlaygroundPluginStartDependencies, SearchPlaygroundPluginStart>,
    { features }: SearchPlaygroundPluginSetupDependencies
  ) {
    this.logger.debug('searchPlayground: Setup');

    core.savedObjects.registerType(createPlaygroundSavedObjectType());

    const router = core.http.createRouter();

    defineRoutes({ router, logger: this.logger, getStartServices: core.getStartServices });

    this.registerAnalyticsEvents(core);

    features.registerKibanaFeature({
      id: PLUGIN_ID,
      minimumLicense: 'enterprise',
      name: PLUGIN_NAME,
      order: 1,
      category: DEFAULT_APP_CATEGORIES.enterpriseSearch,
      scope: [KibanaFeatureScope.Spaces, KibanaFeatureScope.Security],
      app: ['kibana', PLUGIN_ID],
      catalogue: [PLUGIN_ID],
      privileges: {
        all: {
          app: ['kibana', PLUGIN_ID],
          api: [PLUGIN_ID],
          catalogue: [PLUGIN_ID],
          savedObject: {
            all: [PLAYGROUND_SAVED_OBJECT_TYPE],
            read: [PLAYGROUND_SAVED_OBJECT_TYPE],
          },
          ui: [],
        },
        read: {
          disabled: true,
          api: [PLUGIN_ID],
          savedObject: {
            all: [],
            read: [PLAYGROUND_SAVED_OBJECT_TYPE],
          },
          ui: [],
        },
      },
    });

    return {};
  }

  public start(core: CoreStart) {
    return {};
  }

  private registerAnalyticsEvents(core: CoreSetup) {
    core.analytics.registerEventType(sendMessageEvent);
  }

  public stop() {}
}
