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
import { AppStatus, DEFAULT_APP_CATEGORIES } from '@kbn/core/public';
import { i18n } from '@kbn/i18n';
import { ALERTING_V2_ENABLED_SETTING_ID } from '@kbn/alerting-v2-constants';
import { from, map, switchMap } from 'rxjs';
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
      appRoute: OBSERVABILITY_ALERTING_BASE_PATH,
      category: DEFAULT_APP_CATEGORIES.observability,
      euiIconType: 'logoObservability',
      keywords: ['alerting', 'alerts', 'rules', 'episodes', 'inbox'],
      updater$: from(startServices).pipe(
        switchMap(([coreStart]) =>
          coreStart.settings.globalClient.get$<boolean>(ALERTING_V2_ENABLED_SETTING_ID, false).pipe(
            map(
              (settingEnabled): AppUpdater =>
                () => ({
                  status: settingEnabled ? AppStatus.accessible : AppStatus.inaccessible,
                })
            )
          )
        )
      ),
      deepLinks: [
        {
          id: OBSERVABILITY_ALERTING_INBOX_DEEP_LINK_ID,
          title: i18n.translate('xpack.observabilityAlerting.deepLinks.inboxTitle', {
            defaultMessage: 'Alerts (Inbox)',
          }),
          path: OBSERVABILITY_ALERTING_INBOX_PATH,
          visibleIn: ['globalSearch', 'projectSideNav'],
          keywords: ['alerting', 'episodes', 'inbox'],
        },
        {
          id: OBSERVABILITY_ALERTING_RULES_V2_DEEP_LINK_ID,
          title: i18n.translate('xpack.observabilityAlerting.deepLinks.rulesV2Title', {
            defaultMessage: 'Rules',
          }),
          path: OBSERVABILITY_ALERTING_RULES_V2_PATH,
          visibleIn: ['globalSearch', 'projectSideNav'],
          keywords: ['alerting', 'rules', 'esql'],
        },
        {
          id: OBSERVABILITY_ALERTING_RULE_LIBRARY_DEEP_LINK_ID,
          title: i18n.translate('xpack.observabilityAlerting.deepLinks.ruleLibraryTitle', {
            defaultMessage: 'Rule Library',
          }),
          path: OBSERVABILITY_ALERTING_RULE_LIBRARY_PATH,
          visibleIn: ['globalSearch', 'projectSideNav'],
          keywords: ['alerting', 'templates', 'library'],
        },
        {
          id: OBSERVABILITY_ALERTING_ACTION_POLICIES_DEEP_LINK_ID,
          title: i18n.translate('xpack.observabilityAlerting.deepLinks.actionPoliciesTitle', {
            defaultMessage: 'Action Policies',
          }),
          path: OBSERVABILITY_ALERTING_ACTION_POLICIES_PATH,
          visibleIn: ['globalSearch', 'projectSideNav'],
          keywords: ['alerting', 'actions', 'policies'],
        },
        {
          id: OBSERVABILITY_ALERTING_EXECUTION_HISTORY_DEEP_LINK_ID,
          title: i18n.translate('xpack.observabilityAlerting.deepLinks.executionHistoryTitle', {
            defaultMessage: 'Execution History',
          }),
          path: OBSERVABILITY_ALERTING_EXECUTION_HISTORY_PATH,
          visibleIn: ['globalSearch', 'projectSideNav'],
          keywords: ['alerting', 'history', 'executions'],
        },
      ],
      mount: async (params: AppMountParameters) => {
        const [coreStart, depsStart] = await startServices;
        const { mountObservabilityAlertingApp } = await import('./application/mount');
        return mountObservabilityAlertingApp({
          coreStart,
          alertingVTwo: depsStart.alertingVTwo,
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
