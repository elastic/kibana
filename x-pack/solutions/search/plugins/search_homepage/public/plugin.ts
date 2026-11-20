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
import { hasSeenData } from '@kbn/search-shared-ui';
import { PLUGIN_ID } from '../common';
import { ANALYTICS_DEEP_LINK_ID, LEGACY_ANALYTICS_HOME_PATH } from './analytics/constants';
import { WEB_CRAWLS_DEEP_LINK_ID, WEB_CRAWLS_ROUTE } from './home_config';
import { startIngestGate } from './ingest_gate/start_ingest_gate';
import type { IngestGateHandle } from './ingest_gate/start_ingest_gate';
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
  private deepLinks: AppDeepLink[] = [getAnalyticsDeepLink()];
  // Decided before the app renders, so a deployment not known to hold data never shows the chrome.
  private hideChrome = !hasSeenData();
  private ingestGate?: IngestGateHandle;
  private readonly appUpdater$ = new BehaviorSubject<AppUpdater>(() => ({
    hideChrome: this.hideChrome,
  }));

  private readonly updateApp = (): void => {
    const { deepLinks, hideChrome } = this;
    this.appUpdater$.next(() => ({ deepLinks, hideChrome }));
  };

  private readonly setChromeHidden = (isHidden: boolean): void => {
    if (isHidden === this.hideChrome) {
      return;
    }
    this.hideChrome = isHidden;
    this.updateApp();
  };

  public setup(core: CoreSetup<SearchHomepageAppPluginStartDependencies>) {
    core.application.register({
      id: PLUGIN_ID,
      appRoute: '/app/elasticsearch/home',
      title: i18n.translate('xpack.searchHomepage.appTitle', { defaultMessage: 'Home' }),
      category: DEFAULT_APP_CATEGORIES.enterpriseSearch,
      euiIconType: 'logoElasticsearch',
      mount: async ({ element, history }: AppMountParameters) => {
        const { renderApp } = await import('./application');
        const [coreStart, depsStart] = await core.getStartServices();
        const startDeps: SearchHomepageServicesContextDeps = {
          ...depsStart,
          history,
          setChromeHidden: this.setChromeHidden,
          reportHasData: (hasData) => this.ingestGate?.reportHasData(hasData),
        };

        return renderApp(coreStart, startDeps, element);
      },
      order: 0,
      deepLinks: [getAnalyticsDeepLink()],
      updater$: this.appUpdater$,
      visibleIn: ['globalSearch', 'classicSideNav', 'projectSideNav'],
    });
  }

  public start(
    core: CoreStart,
    { cloud, spaces, webCrawler }: SearchHomepageAppPluginStartDependencies
  ) {
    this.ingestGate = startIngestGate(core, { cloud, spaces });

    if (webCrawler) {
      this.deepLinks = [
        getAnalyticsDeepLink(),
        {
          id: WEB_CRAWLS_DEEP_LINK_ID,
          path: WEB_CRAWLS_ROUTE,
          title: i18n.translate('xpack.searchHomepage.webCrawls.linkTitle', {
            defaultMessage: 'Web crawls',
          }),
          visibleIn: ['globalSearch', 'projectSideNav'],
        },
      ];
      this.updateApp();
    }
  }

  public stop() {
    this.ingestGate?.stop();
  }
}
