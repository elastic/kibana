/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { take, mergeMap } from 'rxjs';

import type { CoreSetup, CoreStart, Plugin, PluginInitializerContext } from '@kbn/core/public';
import type { ManagementAppMountParams } from '@kbn/management-plugin/public';
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

  constructor(initializerContext: PluginInitializerContext) {
    this.config = initializerContext.config.get<SearchInferenceEndpointsConfigType>();
  }

  public setup(
    core: CoreSetup<AppPluginStartDependencies, SearchInferenceEndpointsPluginStart>,
    plugins: AppPluginSetupDependencies
  ): SearchInferenceEndpointsPluginSetup {
    if (!this.config.ui?.enabled) return {};

    registerLocators(plugins.share);

    plugins.licensing.license$
      .pipe(take(1))
      .pipe(
        mergeMap(async (license) => {
          const hasEnterpriseLicense =
            license && license.isAvailable && license.isActive && license.hasAtLeast('enterprise');

          if (hasEnterpriseLicense) {
            plugins.management.sections.section.machineLearning.registerApp({
              id: INFERENCE_ENDPOINTS_APP_ID,
              title: PLUGIN_TITLE,
              order: 2,
              async mount({ element, history }: ManagementAppMountParams) {
                const { renderInferenceEndpointsMgmtApp } = await import('./application');
                const [coreStart, depsStart] = await core.getStartServices();
                const startDeps: AppPluginStartDependencies = {
                  ...depsStart,
                  history,
                  searchNavigation: undefined,
                };

                return renderInferenceEndpointsMgmtApp(coreStart, startDeps, element);
              },
            });
          }
        })
      )
      .subscribe();

    return {};
  }

  public start(core: CoreStart): SearchInferenceEndpointsPluginStart {
    docLinks.setDocLinks(core.docLinks.links);
    return {};
  }

  public stop() {}
}
