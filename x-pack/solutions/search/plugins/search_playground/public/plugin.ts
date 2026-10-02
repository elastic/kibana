/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Subject, type Subscription } from 'rxjs';

import type { Plugin } from '@kbn/core/public';
import {
  type AppUpdater,
  type CoreSetup,
  type CoreStart,
  type AppMountParameters,
  type PluginInitializerContext,
  AppStatus,
  DEFAULT_APP_CATEGORIES,
} from '@kbn/core/public';
import { PLAYGROUND_ENABLED_SETTING_ID, PLUGIN_ID, PLUGIN_NAME, PLUGIN_PATH } from '../common';
import { docLinks } from '../common/doc_links';
import type {
  AppPluginSetupDependencies,
  AppPluginStartDependencies,
  AppServices,
  SearchPlaygroundConfigType,
  SearchPlaygroundPluginSetup,
  SearchPlaygroundPluginStart,
} from './types';
import { registerLocators } from './locators';

export class SearchPlaygroundPlugin
  implements Plugin<SearchPlaygroundPluginSetup, SearchPlaygroundPluginStart>
{
  private config: SearchPlaygroundConfigType;
  private licenseSubscription: Subscription | undefined;
  private enabledSettingSubscription: Subscription | undefined;
  private readonly appUpdater$ = new Subject<AppUpdater>();
  private hasRequiredLicense = false;
  private hasExpiredLicense = false;

  constructor(initializerContext: PluginInitializerContext) {
    this.config = initializerContext.config.get<SearchPlaygroundConfigType>();
  }

  public setup(
    core: CoreSetup<AppPluginStartDependencies, SearchPlaygroundPluginStart>,
    deps: AppPluginSetupDependencies
  ): SearchPlaygroundPluginSetup {
    if (!this.config.ui?.enabled) return {};

    core.application.register({
      id: PLUGIN_ID,
      appRoute: PLUGIN_PATH,
      category: DEFAULT_APP_CATEGORIES.enterpriseSearch,
      euiIconType: 'logoElasticsearch',
      title: PLUGIN_NAME,
      mount: async ({ element, history }: AppMountParameters) => {
        const { renderApp } = await import('./application');
        const [coreStart, depsStart] = await core.getStartServices();

        coreStart.chrome.docTitle.change(PLUGIN_NAME);
        depsStart.searchNavigation?.handleOnAppMount();

        const startDeps: AppServices = {
          ...depsStart,
          history,
          licenseManagement: deps.licenseManagement,
          getLicenseStatus: this.getLicenseStatus.bind(this),
        };

        return renderApp(coreStart, startDeps, element);
      },
      visibleIn: ['classicSideNav', 'projectSideNav', 'globalSearch'],
      order: 3,
      // Flipped to `inaccessible` in `start()` while the `searchPlayground:enabled` advanced
      // setting is off. Core then empties `visibleIn`, which removes Playground from the
      // Search navigation trees that link to it.
      updater$: this.appUpdater$,
    });

    registerLocators(deps.share);

    return {};
  }

  public start(
    core: CoreStart,
    { licensing }: AppPluginStartDependencies
  ): SearchPlaygroundPluginStart {
    docLinks.setDocLinks(core.docLinks.links);

    this.enabledSettingSubscription = core.uiSettings
      .get$<boolean>(PLAYGROUND_ENABLED_SETTING_ID, false)
      .subscribe((isEnabled) => {
        this.appUpdater$.next(() => ({
          status: isEnabled ? AppStatus.accessible : AppStatus.inaccessible,
        }));
      });

    this.licenseSubscription = licensing.license$.subscribe((license) => {
      this.hasRequiredLicense =
        license && license.isAvailable && license.isActive && license.hasAtLeast('enterprise');
      this.hasExpiredLicense = license && license.status === 'expired';
    });
    return {};
  }

  public stop() {
    if (this.enabledSettingSubscription) {
      this.enabledSettingSubscription.unsubscribe();
      this.enabledSettingSubscription = undefined;
    }
    if (this.licenseSubscription) {
      this.licenseSubscription.unsubscribe();
      this.licenseSubscription = undefined;
    }
  }

  private getLicenseStatus() {
    return {
      hasRequiredLicense: this.hasRequiredLicense,
      hasExpiredLicense: this.hasExpiredLicense,
    };
  }
}
