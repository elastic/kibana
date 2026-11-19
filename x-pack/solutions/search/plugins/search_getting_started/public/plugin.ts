/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreSetup, CoreStart, Plugin } from '@kbn/core/public';
import { DEFAULT_APP_CATEGORIES } from '@kbn/core/public';
import { PLUGIN_ID, PLUGIN_NAME, PLUGIN_PATH } from '../common';

import type {
  SearchGettingStartedPluginSetup,
  SearchGettingStartedPluginStart,
  SearchGettingStartedAppPluginStartDependencies,
} from './types';

const SEARCH_HOMEPAGE_APP_ID = 'searchHomepage';

export class SearchGettingStartedPlugin
  implements
    Plugin<
      SearchGettingStartedPluginSetup,
      SearchGettingStartedPluginStart,
      {},
      SearchGettingStartedAppPluginStartDependencies
    >
{
  public setup(
    core: CoreSetup<
      SearchGettingStartedAppPluginStartDependencies,
      SearchGettingStartedPluginStart
    >,
    deps: {}
  ): SearchGettingStartedPluginSetup {
    core.application.register({
      id: PLUGIN_ID,
      appRoute: PLUGIN_PATH,
      title: PLUGIN_NAME,
      category: DEFAULT_APP_CATEGORIES.enterpriseSearch,
      euiIconType: 'logoElasticsearch',
      // The unified Elasticsearch home replaced this page; its URL is kept for old links.
      async mount() {
        const [coreStart] = await core.getStartServices();
        await coreStart.application.navigateToApp(SEARCH_HOMEPAGE_APP_ID, { replace: true });

        return () => {};
      },
      order: 1,
      visibleIn: [],
    });

    return {};
  }

  public start(core: CoreStart) {
    return {};
  }

  public stop() {}
}
