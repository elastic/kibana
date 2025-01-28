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
  SearchSynonymsPluginSetup,
  SearchSynonymsPluginStart,
} from './types';
import { SYNONYMS_UI_FLAG } from '../common/ui_flags';
import { docLinks } from '../common/doc_links';
import { PLUGIN_ROUTE_ROOT } from '../common/api_routes';

export class SearchSynonymsPlugin
  implements Plugin<SearchSynonymsPluginSetup, SearchSynonymsPluginStart>
{
  constructor() {}

  public setup(
    core: CoreSetup<AppPluginStartDependencies, SearchSynonymsPluginStart>,
    _: AppPluginSetupDependencies
  ): SearchSynonymsPluginSetup {
    if (!core.settings.client.get<boolean>(SYNONYMS_UI_FLAG, false)) {
      return {};
    }
    core.application.register({
      id: PLUGIN_ID,
      appRoute: PLUGIN_ROUTE_ROOT,
      title: PLUGIN_TITLE,
      deepLinks: [
        {
          id: 'synonyms',
          path: '/',
          title: PLUGIN_TITLE,
          visibleIn: ['globalSearch'],
        },
      ],
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
    });

    return {};
  }

  public start(core: CoreStart): SearchSynonymsPluginStart {
    docLinks.setDocLinks(core.docLinks.links);
    return {};
  }

  public stop() {}
}
