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
import { NIGHTSHIFT_APP_ID, type NightshiftLinkId } from '@kbn/deeplinks-observability';
import { i18n } from '@kbn/i18n';
import { BehaviorSubject, type Subscription } from 'rxjs';
import { NIGHTSHIFT_APP_ROUTE } from '../common/constants';
import { NightshiftSettingsLocatorDefinition } from '../common/locators';
import { FocusedSignificantEventService } from './chat/focused_significant_event_service';
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
  private readonly focusedSignificantEventService = new FocusedSignificantEventService();
  private servicesSubscription?: Subscription;
  private stopped = false;
  private ebtEventsRegistered = false;

  constructor(private readonly context: PluginInitializerContext) {}

  setup(
    coreSetup: CoreSetup<NightshiftStartDependencies>,
    pluginsSetup: NightshiftSetupDependencies
  ): NightshiftPublicSetup {
    const startServicesPromise = coreSetup.getStartServices();

    pluginsSetup.share.url.locators.create(new NightshiftSettingsLocatorDefinition());

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
      deepLinks: [
        {
          id: 'detections' satisfies NightshiftLinkId,
          title: i18n.translate('xpack.nightshift.detectionsDeepLinkTitle', {
            defaultMessage: 'Detections',
          }),
          path: '/detections/events',
          visibleIn: [],
          keywords: ['detections', 'alerts', 'significant events'],
        },
        {
          id: 'rules' satisfies NightshiftLinkId,
          title: i18n.translate('xpack.nightshift.rulesDeepLinkTitle', {
            defaultMessage: 'Rules',
          }),
          path: '/detections/rules',
          visibleIn: [],
          keywords: ['rules', 'queries', 'significant events'],
        },
        {
          id: 'sources' satisfies NightshiftLinkId,
          title: i18n.translate('xpack.nightshift.sourcesDeepLinkTitle', {
            defaultMessage: 'Sources',
          }),
          path: '/sources',
          visibleIn: [],
          keywords: ['sources', 'esql', 'significant events', 'sig events', 'sig events sources'],
        },
        {
          id: 'knowledge_indicators' satisfies NightshiftLinkId,
          title: i18n.translate('xpack.nightshift.knowledgeIndicatorsDeepLinkTitle', {
            defaultMessage: 'Knowledge Indicators',
          }),
          path: '/knowledge/knowledge_indicators',
          visibleIn: [],
          keywords: ['knowledge indicators', 'ki', 'kis', 'knowledge', 'significant events'],
        },
      ],
      updater$: this.appUpdater$,
      mount: async (appMountParameters: AppMountParameters) => {
        // Registered here rather than in setup so the event schemas stay out of the page load
        // bundle: only the app reports them, and it cannot render before this resolves.
        const [[coreStart, pluginsStart], { renderApp }, { registerNightshiftEbtEvents }] =
          await Promise.all([
            startServicesPromise,
            import('./application/render_app'),
            import('./common/ebt_events'),
          ]);

        if (!this.ebtEventsRegistered) {
          this.ebtEventsRegistered = true;
          registerNightshiftEbtEvents(coreSetup.analytics);
        }

        return renderApp({
          appMountParameters,
          coreStart,
          pluginsStart,
          isServerless: this.context.env.packageInfo.buildFlavor === 'serverless',
          focusedSignificantEventService: this.focusedSignificantEventService,
        });
      },
    });

    return {};
  }

  start(coreStart: CoreStart, pluginsStart: NightshiftStartDependencies): NightshiftPublicStart {
    this.stopped = false;
    void import('./start_services')
      .then(({ startNightshiftServices }) => {
        if (this.stopped) {
          return;
        }
        this.servicesSubscription = startNightshiftServices({
          pluginsStart,
          appUpdater$: this.appUpdater$,
          context: this.context,
          chrome: coreStart.chrome,
          focusedSignificantEventService: this.focusedSignificantEventService,
        });
      })
      .catch((error) => {
        this.context.logger.get().error(`Failed to initialize Nightshift: ${error}`);
      });

    return {};
  }

  stop() {
    this.stopped = true;
    this.servicesSubscription?.unsubscribe();
  }
}
