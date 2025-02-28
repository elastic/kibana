/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreSetup, Plugin, AppMountParameters, CoreStart } from '@kbn/core/public';
import { PLUGIN_ID, PLUGIN_NAME, PLUGIN_TITLE } from '../common';
import {
  AppPluginSetupDependencies,
  AppPluginStartDependencies,
  SearchUxSandboxPluginSetup,
  SearchUxSandboxPluginStart,
} from './types';
import { PLUGIN_ROUTE_ROOT } from '../common/api_routes';

export class SearchUxSandboxPlugin
  implements Plugin<SearchUxSandboxPluginSetup, SearchUxSandboxPluginStart>
{
  constructor() {}

  public setup(
    core: CoreSetup<AppPluginStartDependencies, SearchUxSandboxPluginStart>,
    _: AppPluginSetupDependencies
  ): SearchUxSandboxPluginSetup {
    core.application.register({
      id: PLUGIN_ID,
      appRoute: PLUGIN_ROUTE_ROOT,
      title: PLUGIN_TITLE,
      euiIconType: 'beaker',
      async mount({ element, history }: AppMountParameters) {
        const { renderApp } = await import('./application');
        const [coreStart, depsStart] = await core.getStartServices();

        coreStart.chrome.docTitle.change(PLUGIN_NAME);

        const startDeps: AppPluginStartDependencies = {
          ...depsStart,
          history,
        };

        depsStart.searchNavigation?.handleOnAppMount();

        return renderApp(coreStart, startDeps, element);
      },
      visibleIn: [],
      order: 3,
    });

    return {};
  }

  public start(core: CoreStart): SearchUxSandboxPluginStart {
    return {};
  }

  public stop() {}
}
