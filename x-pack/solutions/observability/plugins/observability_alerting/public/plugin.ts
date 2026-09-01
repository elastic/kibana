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
import { isAlertingV2Enabled } from '@kbn/alerting-v2-utils';
import { OBSERVABILITY_OVERVIEW_APP_ID } from '@kbn/deeplinks-observability';
import { BehaviorSubject } from 'rxjs';
import {
  OBSERVABILITY_ALERTING_ACTION_POLICIES_DEEP_LINK_ID,
  OBSERVABILITY_ALERTING_ACTION_POLICIES_PATH,
  OBSERVABILITY_ALERTING_APP_ID,
  OBSERVABILITY_ALERTING_BASE_PATH,
  OBSERVABILITY_ALERTING_EXECUTION_HISTORY_DEEP_LINK_ID,
  OBSERVABILITY_ALERTING_EXECUTION_HISTORY_PATH,
  OBSERVABILITY_ALERTING_INBOX_DEEP_LINK_ID,
  OBSERVABILITY_ALERTING_INBOX_PATH,
  OBSERVABILITY_ALERTING_RULE_LIBRARY_DEEP_LINK_ID,
  OBSERVABILITY_ALERTING_RULE_LIBRARY_PATH,
  OBSERVABILITY_ALERTING_RULES_V2_DEEP_LINK_ID,
  OBSERVABILITY_ALERTING_RULES_V2_PATH,
} from './constants';
import type {
  ObservabilityAlertingPublicSetup,
  ObservabilityAlertingPublicStart,
  ObservabilityAlertingSetupDependencies,
  ObservabilityAlertingStartDependencies,
} from './types';

const GLOBAL_SEARCH_VISIBLE_IN = ['globalSearch'] as const;

export class ObservabilityAlertingPlugin
  implements
    Plugin<
      ObservabilityAlertingPublicSetup,
      ObservabilityAlertingPublicStart,
      ObservabilityAlertingSetupDependencies,
      ObservabilityAlertingStartDependencies
    >
{
  private readonly appUpdater$ = new BehaviorSubject<AppUpdater>(() => ({ visibleIn: [] }));

  public setup(
    coreSetup: CoreSetup<ObservabilityAlertingStartDependencies, ObservabilityAlertingPublicStart>
  ): ObservabilityAlertingPublicSetup {
    const startServicesPromise = coreSetup.getStartServices();

    coreSetup.application.register({
      id: OBSERVABILITY_ALERTING_APP_ID,
      title: i18n.translate('xpack.observabilityAlerting.appTitle', {
        defaultMessage: 'Alerting',
      }),
      appRoute: OBSERVABILITY_ALERTING_BASE_PATH,
      category: DEFAULT_APP_CATEGORIES.observability,
      euiIconType: 'logoObservability',
      keywords: ['alerting', 'alerts', 'rules', 'episodes', 'inbox'],
      visibleIn: [],
      updater$: this.appUpdater$,
      deepLinks: [
        {
          id: OBSERVABILITY_ALERTING_INBOX_DEEP_LINK_ID,
          title: i18n.translate('xpack.observabilityAlerting.deepLinks.inboxTitle', {
            defaultMessage: 'Alerts (Inbox)',
          }),
          path: OBSERVABILITY_ALERTING_INBOX_PATH,
          visibleIn: [...GLOBAL_SEARCH_VISIBLE_IN],
          keywords: ['alerting', 'episodes', 'inbox'],
        },
        {
          id: OBSERVABILITY_ALERTING_RULES_V2_DEEP_LINK_ID,
          title: i18n.translate('xpack.observabilityAlerting.deepLinks.rulesV2Title', {
            defaultMessage: 'Rules (ES|QL)',
          }),
          path: OBSERVABILITY_ALERTING_RULES_V2_PATH,
          visibleIn: [...GLOBAL_SEARCH_VISIBLE_IN],
          keywords: ['alerting', 'rules', 'esql'],
        },
        {
          id: OBSERVABILITY_ALERTING_RULE_LIBRARY_DEEP_LINK_ID,
          title: i18n.translate('xpack.observabilityAlerting.deepLinks.ruleLibraryTitle', {
            defaultMessage: 'Rule Library',
          }),
          path: OBSERVABILITY_ALERTING_RULE_LIBRARY_PATH,
          visibleIn: [...GLOBAL_SEARCH_VISIBLE_IN],
          keywords: ['alerting', 'templates', 'library'],
        },
        {
          id: OBSERVABILITY_ALERTING_ACTION_POLICIES_DEEP_LINK_ID,
          title: i18n.translate('xpack.observabilityAlerting.deepLinks.actionPoliciesTitle', {
            defaultMessage: 'Action Policies',
          }),
          path: OBSERVABILITY_ALERTING_ACTION_POLICIES_PATH,
          visibleIn: [...GLOBAL_SEARCH_VISIBLE_IN],
          keywords: ['alerting', 'actions', 'policies'],
        },
        {
          id: OBSERVABILITY_ALERTING_EXECUTION_HISTORY_DEEP_LINK_ID,
          title: i18n.translate('xpack.observabilityAlerting.deepLinks.executionHistoryTitle', {
            defaultMessage: 'Execution History',
          }),
          path: OBSERVABILITY_ALERTING_EXECUTION_HISTORY_PATH,
          visibleIn: [...GLOBAL_SEARCH_VISIBLE_IN],
          keywords: ['alerting', 'history', 'executions'],
        },
      ],
      mount: async (params: AppMountParameters) => {
        const [coreStart] = await startServicesPromise;

        if (!isAlertingV2Enabled(coreStart)) {
          await coreStart.application.navigateToApp(OBSERVABILITY_OVERVIEW_APP_ID, {
            path: '/alerts',
            replace: true,
          });
          return () => {};
        }

        const { mountObservabilityAlertingApp } = await import('./application/mount');
        return mountObservabilityAlertingApp({
          coreStart,
          params,
        });
      },
    });

    return {};
  }

  public start(coreStart: CoreStart): ObservabilityAlertingPublicStart {
    this.appUpdater$.next(() => ({
      visibleIn: isAlertingV2Enabled(coreStart) ? [...GLOBAL_SEARCH_VISIBLE_IN] : [],
    }));

    return {};
  }

  public stop() {}
}
