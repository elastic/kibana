/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreSetup, CoreStart, Plugin } from '@kbn/core/public';
import { DEFAULT_APP_CATEGORIES } from '@kbn/core/public';
import type { ServerlessVectordbPluginSetup, ServerlessVectordbPluginStart } from './types';

export class ServerlessVectordbPlugin
  implements Plugin<ServerlessVectordbPluginSetup, ServerlessVectordbPluginStart>
{
  public setup(core: CoreSetup): ServerlessVectordbPluginSetup {
    core.application.register({
      id: 'vectordb',
      title: 'Vector DB',
      appRoute: '/app/vectordb',
      euiIconType: 'logoElasticsearch',
      category: DEFAULT_APP_CATEGORIES.enterpriseSearch,
      async mount(params) {
        const { renderApp } = await import('./application');
        return renderApp(params);
      },
    });

    return {};
  }

  public start(_core: CoreStart): ServerlessVectordbPluginStart {
    return {};
  }

  public stop() {}
}
