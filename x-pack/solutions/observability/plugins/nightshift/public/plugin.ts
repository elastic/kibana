/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AppMountParameters, AppUpdater } from '@kbn/core/public';
import {
  DEFAULT_APP_CATEGORIES,
  type CoreSetup,
  type CoreStart,
  type Plugin,
  type PluginInitializerContext,
} from '@kbn/core/public';
import { NIGHTSHIFT_APP_ID } from '@kbn/deeplinks-observability';
import { i18n } from '@kbn/i18n';
import { BehaviorSubject, catchError, from, map, of, type Subscription } from 'rxjs';
import { NIGHTSHIFT_APP_ROUTE } from '../common/constants';
import type {
  NightshiftPublicSetup,
  NightshiftPublicStart,
  NightshiftSetupDependencies,
  NightshiftStartDependencies,
} from './types';

export class NightshiftPlugin
  implements
    Plugin<
      NightshiftPublicSetup,
      NightshiftPublicStart,
      NightshiftSetupDependencies,
      NightshiftStartDependencies
    >
{
  private readonly appUpdater$ = new BehaviorSubject<AppUpdater>(() => ({ visibleIn: [] }));
  private availabilitySubscription?: Subscription;

  constructor(private readonly context: PluginInitializerContext) {}

  setup(coreSetup: CoreSetup<NightshiftStartDependencies>): NightshiftPublicSetup {
    const startServicesPromise = coreSetup.getStartServices();

    coreSetup.application.register({
      id: NIGHTSHIFT_APP_ID,
      title: i18n.translate('xpack.nightshift.appTitle', {
        defaultMessage: 'Nightshift',
      }),
      appRoute: NIGHTSHIFT_APP_ROUTE,
      category: DEFAULT_APP_CATEGORIES.observability,
      euiIconType: 'logoObservability',
      // Replaces the bespoke global search provider the page had while it was an
      // observability deep link: core's application provider scores these keywords
      // with the same algorithm, and the standalone app renders as "Nightshift"
      // rather than "Observability / Nightshift".
      keywords: ['nightshift', 'significant events'],
      // Hidden until Significant Events reports itself available; start() feeds the real value.
      visibleIn: [],
      updater$: this.appUpdater$,
      mount: async (appMountParameters: AppMountParameters) => {
        const [[coreStart, pluginsStart], { renderApp }] = await Promise.all([
          startServicesPromise,
          import('./application/render_app'),
        ]);

        return renderApp({
          appMountParameters,
          coreStart,
          pluginsStart,
          isServerless: this.context.env.packageInfo.buildFlavor === 'serverless',
        });
      },
    });

    return {};
  }

  start(coreStart: CoreStart, pluginsStart: NightshiftStartDependencies): NightshiftPublicStart {
    const { agentBuilder } = pluginsStart;
    if (agentBuilder) {
      void import('./chat/agent_builder/significant_event_attachments')
        .then(({ registerNightshiftAgentBuilderAttachments }) => {
          registerNightshiftAgentBuilderAttachments({ agentBuilder });
        })
        .catch((error) => {
          this.context.logger
            .get('nightshiftAgentBuilderAttachments')
            .error(`Failed to register agent builder attachments: ${error}`);
        });
    }

    // Single source of truth: aggregates rollout flag, project type, pricing tier, license and
    // required plugins. The flag alone would surface the app where the feature cannot run.
    this.availabilitySubscription = from(
      pluginsStart.significantEvents.significantEventsRepositoryClient.fetch(
        'GET /internal/significant_events/availability',
        { signal: null }
      )
    )
      .pipe(
        map(({ available }) => available),
        catchError(() => of(false)),
        map(
          (isAvailable): AppUpdater =>
            () => ({
              visibleIn: isAvailable ? ['globalSearch', 'projectSideNav'] : [],
            })
        )
      )
      .subscribe(this.appUpdater$);

    return {};
  }

  stop() {
    this.availabilitySubscription?.unsubscribe();
  }
}
