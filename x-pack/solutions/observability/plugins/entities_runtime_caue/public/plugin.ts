/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreSetup, CoreStart, Plugin, AppMountParameters } from '@kbn/core/public';
import { DEFAULT_APP_CATEGORIES } from '@kbn/core/public';
import { of } from 'rxjs';
import { i18n } from '@kbn/i18n';
import { APP_ID, APP_ROUTE } from '../common/constants';
import type {
  EntitiesRuntimeCaueSetupDependencies,
  EntitiesRuntimeCaueStartDependencies,
  EntitiesRuntimeCauePublicSetup,
  EntitiesRuntimeCauePublicStart,
} from './types';

export class EntitiesRuntimeCauePlugin
  implements
    Plugin<
      EntitiesRuntimeCauePublicSetup,
      EntitiesRuntimeCauePublicStart,
      EntitiesRuntimeCaueSetupDependencies,
      EntitiesRuntimeCaueStartDependencies
    >
{
  constructor(_ctx: import('@kbn/core/public').PluginInitializerContext) {}

  public setup(
    core: CoreSetup<EntitiesRuntimeCaueStartDependencies>,
    plugins: EntitiesRuntimeCaueSetupDependencies
  ): EntitiesRuntimeCauePublicSetup {
    const startServicesPromise = core.getStartServices();

    plugins.observabilityShared.navigation.registerSections(
      of([
        {
          label: i18n.translate('xpack.entitiesRuntimeCaue.nav.sectionLabel', {
            defaultMessage: 'Runtime Entities',
          }),
          sortKey: 601,
          entries: [
            {
              label: i18n.translate('xpack.entitiesRuntimeCaue.nav.label', {
                defaultMessage: 'Runtime Entity Explorer',
              }),
              app: APP_ID,
              path: '/',
            },
          ],
        },
      ])
    );

    core.application.register({
      id: APP_ID,
      title: i18n.translate('xpack.entitiesRuntimeCaue.appTitle', {
        defaultMessage: 'Runtime Entities',
      }),
      appRoute: APP_ROUTE,
      category: DEFAULT_APP_CATEGORIES.observability,
      euiIconType: 'logoObservability',
      visibleIn: ['classicSideNav', 'globalSearch'],
      mount: async (appMountParameters: AppMountParameters) => {
        const [[coreStart, pluginsStart], { renderApp }] = await Promise.all([
          startServicesPromise,
          import('./application/render_app'),
        ]);
        return renderApp({ appMountParameters, coreStart, pluginsStart });
      },
    });

    return {};
  }

  public start(_core: CoreStart): EntitiesRuntimeCauePublicStart {
    return {};
  }

  public stop(): void {}
}
