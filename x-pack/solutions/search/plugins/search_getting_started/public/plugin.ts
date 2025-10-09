/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  AppMountParameters,
  CoreSetup,
  CoreStart,
  Plugin,
  PluginInitializerContext,
} from '@kbn/core/public';
import { DEFAULT_APP_CATEGORIES } from '@kbn/core/public';
import { PLUGIN_ID, PLUGIN_NAME } from '../common';

import type {
  SearchGettingStartedPluginSetup,
  SearchGettingStartedPluginStart,
  SearchGettingStartedAppPluginStartDependencies,
  SearchGettingStartedServicesContextDeps,
  SearchGettingStartedConfigType,
} from './types';

const appInfo = {
  appRoute: '/app/elasticsearch/getting_started',
  id: PLUGIN_ID,
  title: PLUGIN_NAME,
};
export class SearchGettingStartedPlugin
  implements
    Plugin<
      SearchGettingStartedPluginSetup,
      SearchGettingStartedPluginStart,
      {},
      SearchGettingStartedAppPluginStartDependencies
    >
{
  private config: SearchGettingStartedConfigType;
  constructor(initializerContext: PluginInitializerContext) {
    this.config = initializerContext.config.get<SearchGettingStartedConfigType>();
  }

  public setup(
    core: CoreSetup<
      SearchGettingStartedAppPluginStartDependencies,
      SearchGettingStartedPluginStart
    >,
    deps: {}
  ): SearchGettingStartedPluginSetup {
    if (!this.config?.enabled) return {};

    core.application.register({
      id: PLUGIN_ID,
      appRoute: appInfo.appRoute,
      title: appInfo.title,
      category: DEFAULT_APP_CATEGORIES.enterpriseSearch,
      euiIconType: 'logoElasticsearch',
      async mount({ element, history }: AppMountParameters) {
        const { renderApp } = await import('./application');
        const [coreStart, depsStart] = await core.getStartServices();

        coreStart.chrome.docTitle.change(appInfo.title);
        depsStart.searchNavigation?.handleOnAppMount();
        // Create a QueryClient for the app
        const { QueryClient } = await import('@tanstack/react-query');
        const queryClient = new QueryClient();

        const services: SearchGettingStartedServicesContextDeps = {
          ...depsStart,
          history,
          usageCollection: depsStart.usageCollection,
        };

        return renderApp(coreStart, services, element, queryClient);
      },
      order: 1000,
      visibleIn: ['globalSearch', 'sideNav'],
    });

    return {
      app: appInfo,
    };
  }

  public start(core: CoreStart) {
    return {
      app: appInfo,
    };
  }
}
