/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AppMountParameters, CoreSetup, Plugin } from '@kbn/core/public';
import { DEFAULT_APP_CATEGORIES } from '@kbn/core/public';
import { i18n } from '@kbn/i18n';
import { PLUGIN_ID } from '../common';
import type {
  SearchHomepageAppPluginStartDependencies,
  SearchHomepageServicesContextDeps,
} from './types';

export class SearchHomepagePlugin
  implements Plugin<void, void, {}, SearchHomepageAppPluginStartDependencies>
{
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
      visibleIn: ['globalSearch', 'classicSideNav', 'projectSideNav'],
    });
  }

  public start() {}
}
