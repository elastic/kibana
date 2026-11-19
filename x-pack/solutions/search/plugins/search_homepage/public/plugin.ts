/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { BehaviorSubject } from 'rxjs';
import type {
  AppDeepLink,
  AppMountParameters,
  AppUpdater,
  CoreSetup,
  CoreStart,
  Plugin,
} from '@kbn/core/public';
import { DEFAULT_APP_CATEGORIES } from '@kbn/core/public';
import { i18n } from '@kbn/i18n';
import { PLUGIN_ID } from '../common';
import { ANALYTICS_DEEP_LINK_ID, LEGACY_ANALYTICS_HOME_PATH } from './analytics/constants';
import { WEB_CRAWLS_DEEP_LINK_ID, WEB_CRAWLS_ROUTE } from './home_config';
import type {
  SearchHomepageAppPluginStartDependencies,
  SearchHomepageServicesContextDeps,
} from './types';

const getAnalyticsDeepLink = (): AppDeepLink => ({
  id: ANALYTICS_DEEP_LINK_ID,
  path: LEGACY_ANALYTICS_HOME_PATH,
  title: i18n.translate('xpack.searchHomepage.analytics.deepLinkTitle', {
    defaultMessage: 'Analytics home',
  }),
  visibleIn: ['globalSearch'],
});

export class SearchHomepagePlugin
  implements Plugin<void, void, {}, SearchHomepageAppPluginStartDependencies>
{
  private readonly appUpdater$ = new BehaviorSubject<AppUpdater>(() => ({}));

  public setup(core: CoreSetup<SearchHomepageAppPluginStartDependencies>) {
    core.application.register({
      id: PLUGIN_ID,
      appRoute: '/app/elasticsearch/home',
      title: i18n.translate('xpack.searchHomepage.appTitle', { defaultMessage: 'Home' }),
      category: DEFAULT_APP_CATEGORIES.enterpriseSearch,
      euiIconType: 'logoElasticsearch',
      async mount({ element, history }: AppMountParameters) {
        const { renderApp } = await import('./application');
        const [coreStart, depsStart] = await core.getStartServices();
        const startDeps: SearchHomepageServicesContextDeps = {
          ...depsStart,
          history,
        };

        return renderApp(coreStart, startDeps, element);
      },
      order: 0,
      deepLinks: [getAnalyticsDeepLink()],
      updater$: this.appUpdater$,
      visibleIn: ['globalSearch', 'classicSideNav', 'projectSideNav'],
    });
  }

  public start(core: CoreStart, { webCrawler }: SearchHomepageAppPluginStartDependencies) {
    if (webCrawler) {
      this.appUpdater$.next(() => ({
        deepLinks: [
          getAnalyticsDeepLink(),
          {
            id: WEB_CRAWLS_DEEP_LINK_ID,
            path: WEB_CRAWLS_ROUTE,
            title: i18n.translate('xpack.searchHomepage.webCrawls.linkTitle', {
              defaultMessage: 'Web crawls',
            }),
            visibleIn: ['globalSearch', 'projectSideNav'],
          },
        ],
      }));
    }
  }
}
