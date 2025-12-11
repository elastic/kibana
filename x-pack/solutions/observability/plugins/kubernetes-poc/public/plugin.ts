/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  AppMountParameters,
  CoreSetup,
  CoreStart,
  Plugin,
  PluginInitializerContext,
} from '@kbn/core/public';
import { DEFAULT_APP_CATEGORIES } from '@kbn/core/public';

export class KubernetesPocPlugin implements Plugin {
  constructor(private readonly ctx: PluginInitializerContext) {}

  public setup(core: CoreSetup, plugins: any) {
    core.application.register({
      id: 'kubernetesPoc',
      title: 'Kubernetes POC',
      order: 8600,
      euiIconType: 'logoKubernetes',
      category: DEFAULT_APP_CATEGORIES.observability,
      async mount(appMountParameters: AppMountParameters) {
        const [{ renderApp }, [coreStart]] = await Promise.all([
          import('./application/app'),
          core.getStartServices(),
        ]);

        const { createCallApi } = await import('./services/rest/create_call_api');

        createCallApi(core);

        return renderApp(coreStart, appMountParameters);
      },
    });

    return {};
  }

  public start(core: CoreStart) {
    return {};
  }
}
