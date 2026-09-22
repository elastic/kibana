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
import { SEARCH_ALERTING_APP_ID } from '@kbn/deeplinks-search';
import { from, map, switchMap } from 'rxjs';
import {
  SEARCH_ALERTING_BASE_PATH,
  SEARCH_ALERTING_INBOX_DEEP_LINK_ID,
  SEARCH_ALERTING_INBOX_PATH,
  SEARCH_ALERTING_RULES_V1_DEEP_LINK_ID,
  SEARCH_ALERTING_RULES_V1_PATH,
  SEARCH_ALERTING_RULES_V2_DEEP_LINK_ID,
  SEARCH_ALERTING_RULES_V2_PATH,
  SEARCH_ALERTING_RULE_LIBRARY_DEEP_LINK_ID,
  SEARCH_ALERTING_RULE_LIBRARY_PATH,
  SEARCH_ALERTING_ACTION_POLICIES_DEEP_LINK_ID,
  SEARCH_ALERTING_ACTION_POLICIES_PATH,
  SEARCH_ALERTING_EXECUTION_HISTORY_DEEP_LINK_ID,
  SEARCH_ALERTING_EXECUTION_HISTORY_PATH,
} from './constants';
import type {
  SearchAlertingPublicSetup,
  SearchAlertingPublicStart,
  SearchAlertingSetupDependencies,
  SearchAlertingStartDependencies,
} from './types';

export class SearchAlertingPlugin
  implements
    Plugin<
      SearchAlertingPublicSetup,
      SearchAlertingPublicStart,
      SearchAlertingSetupDependencies,
      SearchAlertingStartDependencies
    >
{
  public setup(
    coreSetup: CoreSetup<SearchAlertingStartDependencies, SearchAlertingPublicStart>
  ): SearchAlertingPublicSetup {
    const startServices = coreSetup.getStartServices();

    coreSetup.application.register({
      id: SEARCH_ALERTING_APP_ID,
      title: i18n.translate('xpack.searchAlerting.appTitle', {
        defaultMessage: 'Alerting',
      }),
      appRoute: SEARCH_ALERTING_BASE_PATH,
      category: DEFAULT_APP_CATEGORIES.enterpriseSearch,
      status: AppStatus.inaccessible,
      visibleIn: [],
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
          id: SEARCH_ALERTING_INBOX_DEEP_LINK_ID,
          title: i18n.translate('xpack.searchAlerting.deepLinks.inboxTitle', {
            defaultMessage: 'Alerts (Inbox)',
          }),
          path: SEARCH_ALERTING_INBOX_PATH,
          visibleIn: [],
          keywords: ['alerting', 'episodes', 'inbox'],
        },
        {
          id: SEARCH_ALERTING_RULES_V1_DEEP_LINK_ID,
          title: i18n.translate('xpack.searchAlerting.deepLinks.rulesV1Title', {
            defaultMessage: 'Rules (v1)',
          }),
          path: SEARCH_ALERTING_RULES_V1_PATH,
          visibleIn: [],
          keywords: ['alerting', 'rules', 'classic', 'v1'],
        },
        {
          id: SEARCH_ALERTING_RULES_V2_DEEP_LINK_ID,
          title: i18n.translate('xpack.searchAlerting.deepLinks.rulesV2Title', {
            defaultMessage: 'Rules',
          }),
          path: SEARCH_ALERTING_RULES_V2_PATH,
          visibleIn: [],
          keywords: ['alerting', 'rules', 'esql'],
        },
        {
          id: SEARCH_ALERTING_RULE_LIBRARY_DEEP_LINK_ID,
          title: i18n.translate('xpack.searchAlerting.deepLinks.ruleLibraryTitle', {
            defaultMessage: 'Rule Library',
          }),
          path: SEARCH_ALERTING_RULE_LIBRARY_PATH,
          visibleIn: [],
          keywords: ['alerting', 'templates', 'library'],
        },
        {
          id: SEARCH_ALERTING_ACTION_POLICIES_DEEP_LINK_ID,
          title: i18n.translate('xpack.searchAlerting.deepLinks.actionPoliciesTitle', {
            defaultMessage: 'Action Policies',
          }),
          path: SEARCH_ALERTING_ACTION_POLICIES_PATH,
          visibleIn: [],
          keywords: ['alerting', 'actions', 'policies'],
        },
        {
          id: SEARCH_ALERTING_EXECUTION_HISTORY_DEEP_LINK_ID,
          title: i18n.translate('xpack.searchAlerting.deepLinks.executionHistoryTitle', {
            defaultMessage: 'Execution History',
          }),
          path: SEARCH_ALERTING_EXECUTION_HISTORY_PATH,
          visibleIn: [],
          keywords: ['alerting', 'history', 'executions'],
        },
      ],
      mount: async (params: AppMountParameters) => {
        const [coreStart, depsStart] = await startServices;
        const { mountSearchAlertingApp } = await import('./application/mount');
        return mountSearchAlertingApp({
          coreStart,
          alertingVTwo: depsStart.alertingVTwo,
          triggersActionsUi: depsStart.triggersActionsUi,
          params,
        });
      },
    });

    return {};
  }

  public start(_coreStart: CoreStart): SearchAlertingPublicStart {
    return {};
  }

  public stop() {}
}
