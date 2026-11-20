/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { BehaviorSubject } from 'rxjs';
import type {
  AppMountParameters,
  AppUpdater,
  CoreSetup,
  CoreStart,
  Plugin,
  PluginInitializerContext,
} from '@kbn/core/public';
import { DEFAULT_APP_CATEGORIES } from '@kbn/core/public';
import { QueryClient } from '@kbn/react-query';
import { hasSeenData } from '@kbn/search-shared-ui';
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
  private readonly kibanaVersion: string;

  constructor(private readonly initializerContext: PluginInitializerContext) {
    this.kibanaVersion = this.initializerContext.env.packageInfo.version;
  }

  public setup(
    core: CoreSetup<
      SearchGettingStartedAppPluginStartDependencies,
      SearchGettingStartedPluginStart
    >,
    deps: {}
  ): SearchGettingStartedPluginSetup {
    const queryClient = new QueryClient({});
    const kibanaVersion = this.kibanaVersion;
    // Decided before the app renders: a deployment not known to hold data gets no chrome here either.
    const getAppUpdate: AppUpdater = () => ({ hideChrome: !hasSeenData() });
    const appUpdater$ = new BehaviorSubject<AppUpdater>(getAppUpdate);
    core.application.register({
      id: PLUGIN_ID,
      appRoute: PLUGIN_PATH,
      title: PLUGIN_NAME,
      category: DEFAULT_APP_CATEGORIES.enterpriseSearch,
      euiIconType: 'logoElasticsearch',
      async mount({ element, history }: AppMountParameters) {
        appUpdater$.next(getAppUpdate);
        const { renderApp } = await import('./application');
        const [coreStart, depsStart] = await core.getStartServices();
        docLinks.setDocLinks(coreStart.docLinks.links);
        const services: SearchGettingStartedServicesContextDeps = {
          ...depsStart,
          history,
          usageCollection: depsStart.usageCollection,
        };

        return renderApp(coreStart, services, element, queryClient, kibanaVersion);
      },
      order: 1,
      updater$: appUpdater$,
      visibleIn: [],
    });

    return {};
  }

  public start(core: CoreStart) {
    return {};
  }

  public stop() {}
}
