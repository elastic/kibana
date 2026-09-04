/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  DEFAULT_APP_CATEGORIES,
  type AppMountParameters,
  type CoreSetup,
  type CoreStart,
  type Plugin,
} from '@kbn/core/public';
import { i18n } from '@kbn/i18n';
import { of } from 'rxjs';
import { APP_ID, APP_ROUTE } from '../common/constants';
import type {
  EntitiesCauePublicSetup,
  EntitiesCauePublicStart,
  EntitiesCaueSetupDependencies,
  EntitiesCaueStartDependencies,
} from './types';

export class EntitiesCauePlugin
  implements
    Plugin<
      EntitiesCauePublicSetup,
      EntitiesCauePublicStart,
      EntitiesCaueSetupDependencies,
      EntitiesCaueStartDependencies
    >
{
  setup(
    core: CoreSetup<EntitiesCaueStartDependencies>,
    plugins: EntitiesCaueSetupDependencies
  ): EntitiesCauePublicSetup {
    const startServicesPromise = core.getStartServices();

    plugins.observabilityShared.navigation.registerSections(
      of([
        {
          label: i18n.translate('xpack.entitiesCaue.nav.sectionLabel', {
            defaultMessage: 'Entity Store',
          }),
          sortKey: 600,
          entries: [
            {
              label: i18n.translate('xpack.entitiesCaue.nav.serviceEntitiesLabel', {
                defaultMessage: 'Service Entities',
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
      title: i18n.translate('xpack.entitiesCaue.appTitle', {
        defaultMessage: 'Entities Caue',
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

  start(
    _coreStart: CoreStart,
    _pluginsStart: EntitiesCaueStartDependencies
  ): EntitiesCauePublicStart {
    return {};
  }
}
