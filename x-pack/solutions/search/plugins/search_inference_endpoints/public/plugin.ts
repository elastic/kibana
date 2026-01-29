/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { BehaviorSubject, type Subscription } from 'rxjs';

import type {
  AppMountParameters,
  AppUpdater,
  CoreSetup,
  CoreStart,
  Plugin,
  PluginInitializerContext,
} from '@kbn/core/public';
import { AppStatus, DEFAULT_APP_CATEGORIES } from '@kbn/core/public';
import { PLUGIN_ID, PLUGIN_TITLE } from '../common/constants';
import { docLinks } from '../common/doc_links';
import type {
  AppPluginSetupDependencies,
  AppPluginStartDependencies,
  SearchInferenceEndpointsConfigType,
  SearchInferenceEndpointsPluginSetup,
  SearchInferenceEndpointsPluginStart,
} from './types';
import { registerLocators } from './locators';
import { INFERENCE_ENDPOINTS_PATH } from './components/routes';

export class SearchInferenceEndpointsPlugin
  implements Plugin<SearchInferenceEndpointsPluginSetup, SearchInferenceEndpointsPluginStart>
{
  private config: SearchInferenceEndpointsConfigType;
  private readonly appUpdater$ = new BehaviorSubject<AppUpdater>(() => ({}));
  private licenseSubscription: Subscription | undefined;

  constructor(initializerContext: PluginInitializerContext) {
    this.config = initializerContext.config.get<SearchInferenceEndpointsConfigType>();
  }

  public setup(
    core: CoreSetup<AppPluginStartDependencies, SearchInferenceEndpointsPluginStart>,
    plugins: AppPluginSetupDependencies
  ): SearchInferenceEndpointsPluginSetup {
    if (!this.config.ui?.enabled) return {};
    core.application.register({
      id: PLUGIN_ID,
      appRoute: '/app/elasticsearch/relevance',
      category: DEFAULT_APP_CATEGORIES.enterpriseSearch,
      deepLinks: [
        {
          id: 'inferenceEndpoints',
          path: `/${INFERENCE_ENDPOINTS_PATH}`,
          title: PLUGIN_TITLE,
          visibleIn: ['globalSearch'],
        },
      ],
      status: AppStatus.inaccessible,
      title: PLUGIN_TITLE,
      updater$: this.appUpdater$,
      async mount({ element, history }: AppMountParameters) {
        const { renderApp } = await import('./application');
        const [coreStart, depsStart] = await core.getStartServices();
        const startDeps: AppPluginStartDependencies = {
          ...depsStart,
          history,
        };

        depsStart.searchNavigation?.handleOnAppMount();

        return renderApp(coreStart, startDeps, element);
      },
      order: 6,
      visibleIn: ['sideNav'],
    });

    registerLocators(plugins.share);

    return {};
  }

  public start(
    core: CoreStart,
    deps: AppPluginStartDependencies
  ): SearchInferenceEndpointsPluginStart {
    const { licensing } = deps;
    docLinks.setDocLinks(core.docLinks.links);

    this.licenseSubscription = licensing.license$.subscribe((license) => {
      const status: AppStatus =
        license && license.isAvailable && license.isActive && license.hasAtLeast('enterprise')
          ? AppStatus.accessible
          : AppStatus.inaccessible;

      this.appUpdater$.next(() => ({
        status,
      }));
    });

    return {};
  }

  public stop() {
    if (this.licenseSubscription) {
      this.licenseSubscription.unsubscribe();
      this.licenseSubscription = undefined;
    }
  }
}
