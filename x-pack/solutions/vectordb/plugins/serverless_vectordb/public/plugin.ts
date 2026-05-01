/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { of } from 'rxjs';
import type { CoreSetup, CoreStart, Plugin } from '@kbn/core/public';
import { DEFAULT_APP_CATEGORIES } from '@kbn/core/public';
import { i18n } from '@kbn/i18n';
import { createNavigationTree } from './navigation_tree';
import type {
  ServerlessVectordbPluginSetup,
  ServerlessVectordbPluginStart,
  ServerlessVectordbServices,
  ServerlessVectordbStartDependencies,
} from './types';

export class ServerlessVectordbPlugin
  implements
    Plugin<
      ServerlessVectordbPluginSetup,
      ServerlessVectordbPluginStart,
      {},
      ServerlessVectordbStartDependencies
    >
{
  public setup(
    core: CoreSetup<ServerlessVectordbStartDependencies, ServerlessVectordbPluginStart>
  ): ServerlessVectordbPluginSetup {
    core.application.register({
      id: 'vectordb',
      title: 'Vector DB',
      appRoute: '/app/vectordb',
      euiIconType: 'logoElasticsearch',
      category: DEFAULT_APP_CATEGORIES.enterpriseSearch,
      deepLinks: [
        {
          id: 'tutorials',
          path: '/tutorials',
          title: i18n.translate('xpack.serverlessVectordb.tutorials.title', {
            defaultMessage: 'Tutorials',
          }),
        },
      ],
      async mount(params) {
        const [coreStart, depsStart] = await core.getStartServices();
        const { renderApp } = await import('./application');
        const appServices: ServerlessVectordbServices = {
          ...coreStart,
          share: depsStart.share,
          console: depsStart.console,
          cloud: depsStart.cloud,
          agentBuilder: depsStart.agentBuilder,
          history: params.history,
        };
        return renderApp(coreStart, appServices, params);
      },
    });

    return {};
  }

  public start(
    _core: CoreStart,
    { serverless }: ServerlessVectordbStartDependencies
  ): ServerlessVectordbPluginStart {
    serverless.initNavigation('vectordb', of(createNavigationTree()));
    return {};
  }

  public stop() {}
}
