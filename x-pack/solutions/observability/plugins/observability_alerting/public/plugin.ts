/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  AppMountParameters,
  AppUpdater,
  CoreSetup,
  CoreStart,
  Plugin,
} from '@kbn/core/public';
import { DEFAULT_APP_CATEGORIES } from '@kbn/core/public';
import { i18n } from '@kbn/i18n';
import {
  OBSERVABILITY_ALERTING_APP_ID,
  OBSERVABILITY_ALERTING_BASE_PATH,
} from '@kbn/deeplinks-observability';
import { from, map } from 'rxjs';
import { getObservabilityAlertingDeepLinks } from './get_observability_alerting_deep_links';
import type {
  ObservabilityAlertingPublicSetup,
  ObservabilityAlertingPublicStart,
  ObservabilityAlertingSetupDependencies,
  ObservabilityAlertingStartDependencies,
} from './types';

export class ObservabilityAlertingPlugin
  implements
    Plugin<
      ObservabilityAlertingPublicSetup,
      ObservabilityAlertingPublicStart,
      ObservabilityAlertingSetupDependencies,
      ObservabilityAlertingStartDependencies
    >
{
  public setup(
    coreSetup: CoreSetup<ObservabilityAlertingStartDependencies, ObservabilityAlertingPublicStart>
  ): ObservabilityAlertingPublicSetup {
    const startServices = coreSetup.getStartServices();

    coreSetup.application.register({
      id: OBSERVABILITY_ALERTING_APP_ID,
      title: i18n.translate('xpack.observabilityAlerting.appTitle', {
        defaultMessage: 'Alerting',
      }),
      euiIconType: 'logoObservability',
      appRoute: OBSERVABILITY_ALERTING_BASE_PATH,
      category: DEFAULT_APP_CATEGORIES.observability,
      visibleIn: [],
      updater$: from(startServices).pipe(
        map(
          ([coreStart]): AppUpdater =>
            () => ({
              deepLinks: getObservabilityAlertingDeepLinks(coreStart.application.capabilities),
            })
        )
      ),
      deepLinks: getObservabilityAlertingDeepLinks(),
      mount: async (params: AppMountParameters) => {
        const [coreStart, depsStart] = await startServices;
        const { mountObservabilityAlertingApp } = await import('./application/mount');
        return mountObservabilityAlertingApp({
          coreStart,
          alertingVTwo: depsStart.alertingVTwo,
          triggersActionsUi: depsStart.triggersActionsUi,
          params,
        });
      },
    });

    return {};
  }

  public start(_coreStart: CoreStart): ObservabilityAlertingPublicStart {
    return {};
  }

  public stop() {}
}
