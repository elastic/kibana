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
  AppDeepLink,
} from '@kbn/core/public';
import { DEFAULT_APP_CATEGORIES } from '@kbn/core/public';
import { i18n } from '@kbn/i18n';
import type { KubernetesPocPluginSetupDeps, KubernetesPocPluginStartDeps } from './types';

const kubernetesOverviewTitle = i18n.translate(
  'xpack.kubernetesPoc.navigation.kubernetesOverviewTitle',
  {
    defaultMessage: 'Kubernetes Overview',
  }
);

const kubernetesClustersTitle = i18n.translate(
  'xpack.kubernetesPoc.navigation.kubernetesClustersTitle',
  {
    defaultMessage: 'Kubernetes Clusters',
  }
);

// Deep links for the navigation system
const deepLinks: AppDeepLink[] = [
  {
    id: 'overview',
    title: kubernetesOverviewTitle,
    path: '/overview',
  },
  {
    id: 'clusters',
    title: kubernetesClustersTitle,
    path: '/clusters',
  },
];

export class KubernetesPocPlugin
  implements Plugin<void, void, KubernetesPocPluginSetupDeps, KubernetesPocPluginStartDeps>
{
  constructor(_ctx: PluginInitializerContext) {}

  public setup(
    core: CoreSetup<KubernetesPocPluginStartDeps>,
    pluginsSetup: KubernetesPocPluginSetupDeps
  ) {
    core.application.register({
      id: 'kubernetesPoc',
      title: 'Kubernetes',
      order: 8600,
      euiIconType: 'logoKubernetes',
      category: DEFAULT_APP_CATEGORIES.observability,
      deepLinks,
      async mount(appMountParameters: AppMountParameters) {
        const [{ renderApp }, [coreStart, pluginsStart]] = await Promise.all([
          import('./application/app'),
          core.getStartServices(),
        ]);

        const { createCallApi } = await import('./services/rest/create_call_api');

        createCallApi(core);

        return renderApp({
          core: coreStart,
          plugins: pluginsStart,
          appMountParameters,
          ObservabilityPageTemplate: pluginsStart.observabilityShared.navigation.PageTemplate,
        });
      },
    });

    return;
  }

  public start(core: CoreStart) {
    return;
  }
}
