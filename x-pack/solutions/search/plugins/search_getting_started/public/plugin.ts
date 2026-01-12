/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AppMountParameters, CoreSetup, CoreStart, Plugin } from '@kbn/core/public';
import { DEFAULT_APP_CATEGORIES } from '@kbn/core/public';
import { QueryClient } from '@kbn/react-query';
import { PLUGIN_ID, PLUGIN_NAME, PLUGIN_PATH } from '../common';

import type {
  SearchGettingStartedPluginSetup,
  SearchGettingStartedPluginStart,
  SearchGettingStartedAppPluginStartDependencies,
  SearchGettingStartedServicesContextDeps,
} from './types';
import { docLinks } from './common/doc_links';

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
    const queryClient = new QueryClient({});
    core.application.register({
      id: PLUGIN_ID,
      appRoute: PLUGIN_PATH,
      title: PLUGIN_NAME,
      category: DEFAULT_APP_CATEGORIES.enterpriseSearch,
      euiIconType: 'logoElasticsearch',
      async mount({ element, history }: AppMountParameters) {
        const { renderApp } = await import('./application');
        const [coreStart, depsStart] = await core.getStartServices();
        docLinks.setDocLinks(coreStart.docLinks.links);
        const services: SearchGettingStartedServicesContextDeps = {
          ...depsStart,
          history,
          usageCollection: depsStart.usageCollection,
        };

        return renderApp(coreStart, services, element, queryClient);
      },
      order: 1,
      visibleIn: ['globalSearch', 'sideNav'],
    });

    return {};
  }

  public start(core: CoreStart) {
    return {};
  }

  public stop() {}
}
