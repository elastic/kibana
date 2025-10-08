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
import { i18n } from '@kbn/i18n';
import { PLUGIN_ID, PLUGIN_NAME, PLUGIN_PATH } from '../common';

import type {
  SearchGettingStartedPluginSetup,
  SearchGettingStartedPluginStart,
  SearchGettingStartedAppPluginStartDependencies,
  SearchGettingStartedServicesContextDeps,
} from './types';
import { config } from './config';

export class SearchGettingStartedPlugin
  implements
    Plugin<
      SearchGettingStartedPluginSetup,
      SearchGettingStartedPluginStart,
      {},
      SearchGettingStartedAppPluginStartDependencies
    >
{
  private config: ReturnType<typeof config.schema.validate>;
  constructor(initializerContext: PluginInitializerContext) {
    this.config = initializerContext.config.get();
  }

  public setup(
    core: CoreSetup<
      SearchGettingStartedAppPluginStartDependencies,
      SearchGettingStartedPluginStart
    >,
    deps: {}
  ): SearchGettingStartedPluginSetup {
    console.log('SearchGettingStartedPlugin setup', this.config);
    if (!this.config.ui?.enabled) return {};

    const appInfo = {
      appRoute: '/app/elasticsearch/getting_started',
      id: PLUGIN_ID,
      title: i18n.translate('xpack.searchGettingStarted.appTitle', {
        defaultMessage: 'Getting Started asdf',
      }),
    };

    core.application.register({
      id: PLUGIN_ID,
      appRoute: appInfo.appRoute,
      title: appInfo.title,
      category: DEFAULT_APP_CATEGORIES.enterpriseSearch,
      euiIconType: 'logoElasticsearch',
      async mount({ element, history }: AppMountParameters) {
        const { renderApp } = await import('./application');
        const [coreStart, depsStart] = await core.getStartServices();

        coreStart.chrome.docTitle.change(PLUGIN_NAME);
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
      // After turning on feature flag, make it visible in globalSearch and sideNav
      visibleIn: [],
    });

    return {
      app: appInfo,
    };
  }

  public start(
    core: CoreStart,
    deps: SearchGettingStartedAppPluginStartDependencies
  ): SearchGettingStartedPluginStart {
    const appInfo = {
      appRoute: PLUGIN_PATH,
      id: PLUGIN_ID,
      title: i18n.translate('xpack.searchGettingStarted.appTitle', {
        defaultMessage: 'Getting Started ASDF',
      }),
    };

    return {
      app: appInfo,
    };
  }
}
