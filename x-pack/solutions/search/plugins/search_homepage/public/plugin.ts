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
import { PLUGIN_ID } from '../common';

import { docLinks } from '../common/doc_links';
import { SearchHomepage } from './embeddable';
import { initQueryClient } from './services/query_client';
import type {
  SearchHomepageAppInfo,
  SearchHomepageAppPluginStartDependencies,
  SearchHomepagePluginSetup,
  SearchHomepagePluginStart,
  SearchHomepageServicesContextDeps,
} from './types';

const appInfo: SearchHomepageAppInfo = {
  id: PLUGIN_ID,
  appRoute: '/app/elasticsearch/home',
  title: i18n.translate('xpack.searchHomepage.appTitle', { defaultMessage: 'Home' }),
};

export class SearchHomepagePlugin
  implements Plugin<SearchHomepagePluginSetup, SearchHomepagePluginStart, {}, {}>
{
  private readonly kibanaVersion: string;

  constructor(private readonly initializerContext: PluginInitializerContext) {
    this.kibanaVersion = this.initializerContext.env.packageInfo.version;
  }

  public setup(
    core: CoreSetup<SearchHomepageAppPluginStartDependencies, SearchHomepagePluginStart>
  ) {
    const queryClient = initQueryClient(core.notifications.toasts);
    const result: SearchHomepagePluginSetup = {
      app: appInfo,
    };

    const kibanaVersion = this.kibanaVersion;

    core.application.register({
      id: PLUGIN_ID,
      appRoute: '/app/elasticsearch/home',
      title: i18n.translate('xpack.searchHomepage.appTitle', { defaultMessage: 'Home' }),
      category: DEFAULT_APP_CATEGORIES.enterpriseSearch,
      euiIconType: 'logoElasticsearch',
      async mount({ element, history }: AppMountParameters) {
        const { renderApp } = await import('./application');
        const [coreStart, depsStart] = await core.getStartServices();
        docLinks.setDocLinks(coreStart.docLinks.links);
        const startDeps: SearchHomepageServicesContextDeps = {
          ...depsStart,
          history,
        };

        return renderApp(coreStart, startDeps, element, queryClient, kibanaVersion);
      },
      order: 0,
      visibleIn: ['globalSearch', 'sideNav'],
    });

    return result;
  }

  public start(core: CoreStart) {
    return {
      app: appInfo,
      SearchHomepage,
    };
  }
}
