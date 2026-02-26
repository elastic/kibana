/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Subscription } from 'rxjs';

import type { CoreSetup, CoreStart, Plugin, PluginInitializerContext } from '@kbn/core/public';
import type { ManagementSetup } from '@kbn/management-plugin/public';
import { INFERENCE_ENDPOINTS_APP_ID, PLUGIN_TITLE } from '../common/constants';
import { docLinks } from '../common/doc_links';
import type {
  AppPluginSetupDependencies,
  AppPluginStartDependencies,
  SearchInferenceEndpointsConfigType,
  SearchInferenceEndpointsPluginSetup,
  SearchInferenceEndpointsPluginStart,
} from './types';
import { registerLocators } from './locators';

export class SearchInferenceEndpointsPlugin
  implements Plugin<SearchInferenceEndpointsPluginSetup, SearchInferenceEndpointsPluginStart>
{
  private config: SearchInferenceEndpointsConfigType;
  private licenseSubscription: Subscription | undefined;
  private managementSetup: ManagementSetup | undefined;
  private coreSetup:
    | CoreSetup<AppPluginStartDependencies, SearchInferenceEndpointsPluginStart>
    | undefined;
  private managementAppRegistered = false;

  constructor(initializerContext: PluginInitializerContext) {
    this.config = initializerContext.config.get<SearchInferenceEndpointsConfigType>();
  }

  public setup(
    core: CoreSetup<AppPluginStartDependencies, SearchInferenceEndpointsPluginStart>,
    plugins: AppPluginSetupDependencies
  ): SearchInferenceEndpointsPluginSetup {
    if (!this.config.ui?.enabled) return {};

    this.coreSetup = core;
    this.managementSetup = plugins.management;

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
      const hasEnterpriseLicense =
        license && license.isAvailable && license.isActive && license.hasAtLeast('enterprise');

      const canAccessInferenceEndpoints =
        core.application.capabilities.management?.ml?.inference_endpoints === true;

      if (
        hasEnterpriseLicense &&
        canAccessInferenceEndpoints &&
        !this.managementAppRegistered &&
        this.managementSetup &&
        this.coreSetup
      ) {
        const coreSetupRef = this.coreSetup;
        this.managementSetup.sections.section.machineLearning.registerApp({
          id: INFERENCE_ENDPOINTS_APP_ID,
          title: PLUGIN_TITLE,
          order: 2,
          async mount(params) {
            const { renderInferenceEndpointsMgmtApp } = await import('./application');
            const [coreStart, depsStart] = await coreSetupRef.getStartServices();
            const startDeps: AppPluginStartDependencies = {
              ...depsStart,
              history: params.history,
              searchNavigation: undefined,
            };

            return renderInferenceEndpointsMgmtApp(coreStart, startDeps, params.element);
          },
        });
        this.managementAppRegistered = true;
      }
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
