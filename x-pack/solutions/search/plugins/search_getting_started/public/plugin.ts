/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { BehaviorSubject, type Subscription } from 'rxjs';

import type { AppMountParameters, CoreSetup, CoreStart, Plugin } from '@kbn/core/public';
import { AppStatus, DEFAULT_APP_CATEGORIES, type AppUpdater } from '@kbn/core/public';
import { QueryClient } from '@kbn/react-query';
import { SEARCH_GETTING_STARTED_FEATURE_FLAG } from '@kbn/search-shared-ui/src/constants';
import { PLUGIN_ID, PLUGIN_NAME, PLUGIN_PATH } from '../common';

import type {
  SearchGettingStartedPluginSetup,
  SearchGettingStartedPluginStart,
  SearchGettingStartedAppPluginStartDependencies,
  SearchGettingStartedServicesContextDeps,
} from './types';

export class SearchGettingStartedPlugin
  implements
    Plugin<
      SearchGettingStartedPluginSetup,
      SearchGettingStartedPluginStart,
      {},
      SearchGettingStartedAppPluginStartDependencies
    >
{
  private readonly appUpdater$ = new BehaviorSubject<AppUpdater>(() => ({}));
  private featureFlagSubscription: Subscription | undefined;

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
        const services: SearchGettingStartedServicesContextDeps = {
          ...depsStart,
          history,
          usageCollection: depsStart.usageCollection,
        };

        return renderApp(coreStart, services, element, queryClient);
      },
      status: AppStatus.inaccessible,
      updater$: this.appUpdater$,
      order: 1,
      visibleIn: ['globalSearch', 'sideNav'],
    });

    return {};
  }

  public start(core: CoreStart) {
    // Create a subscription for the value of our feature flag
    this.featureFlagSubscription = core.featureFlags
      .getBooleanValue$(SEARCH_GETTING_STARTED_FEATURE_FLAG, false)
      .subscribe((featureFlagEnabled) => {
        const status: AppStatus = featureFlagEnabled
          ? AppStatus.accessible
          : AppStatus.inaccessible;
        // This will update the Kibana application's status based on the current value of the feature flag
        this.appUpdater$.next(() => ({
          status,
        }));
      });
    return {};
  }

  public stop() {
    if (this.featureFlagSubscription) {
      this.featureFlagSubscription.unsubscribe();
      this.featureFlagSubscription = undefined;
    }
  }
}
