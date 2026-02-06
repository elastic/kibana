/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { type Subscription } from 'rxjs';

import type { Plugin } from '@kbn/core/public';
import {
  type CoreSetup,
  type CoreStart,
  type AppMountParameters,
  type PluginInitializerContext,
  DEFAULT_APP_CATEGORIES,
} from '@kbn/core/public';
import { PLUGIN_ID, PLUGIN_NAME, PLUGIN_PATH } from '../common';
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
      visibleIn: ['sideNav', 'globalSearch'],
      order: 3,
    });

    registerLocators(deps.share);

    return {};
  }

  public start(
    core: CoreStart,
    { licensing }: AppPluginStartDependencies
  ): SearchPlaygroundPluginStart {
    docLinks.setDocLinks(core.docLinks.links);

    this.licenseSubscription = licensing.license$.subscribe((license) => {
      this.hasRequiredLicense =
        license && license.isAvailable && license.isActive && license.hasAtLeast('enterprise');
      this.hasExpiredLicense = license && license.status === 'expired';
    });
    return {};
  }

  public stop() {
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
