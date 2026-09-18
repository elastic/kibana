/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AppDeepLink, AppDeepLinkLocations, Capabilities } from '@kbn/core/public';
import { i18n } from '@kbn/i18n';
import { hasObservabilityAlertingPrivilege } from './application/has_observability_alerting_privilege';
import {
  OBSERVABILITY_ALERTING_ACTION_POLICIES_DEEP_LINK_ID,
  OBSERVABILITY_ALERTING_ACTION_POLICIES_PATH,
  OBSERVABILITY_ALERTING_ALERTS_DEEP_LINK_ID,
  OBSERVABILITY_ALERTING_ALERTS_PATH,
  OBSERVABILITY_ALERTING_EXECUTION_HISTORY_DEEP_LINK_ID,
  OBSERVABILITY_ALERTING_EXECUTION_HISTORY_PATH,
  OBSERVABILITY_ALERTING_RULE_LIBRARY_DEEP_LINK_ID,
  OBSERVABILITY_ALERTING_RULE_LIBRARY_PATH,
  OBSERVABILITY_ALERTING_RULES_V1_DEEP_LINK_ID,
  OBSERVABILITY_ALERTING_RULES_V1_PATH,
  OBSERVABILITY_ALERTING_RULES_V2_DEEP_LINK_ID,
  OBSERVABILITY_ALERTING_RULES_V2_PATH,
} from './constants';

const SEARCHABLE_VISIBLE_IN: AppDeepLinkLocations[] = ['globalSearch', 'projectSideNav'];

const canAccessDeepLink = (id: string, capabilities: Capabilities): boolean => {
  switch (id) {
    case OBSERVABILITY_ALERTING_ALERTS_DEEP_LINK_ID:
      return hasObservabilityAlertingPrivilege(capabilities, ['alerts'], 'read');
    case OBSERVABILITY_ALERTING_RULES_V1_DEEP_LINK_ID:
    case OBSERVABILITY_ALERTING_RULES_V2_DEEP_LINK_ID:
      return hasObservabilityAlertingPrivilege(capabilities, ['rules'], 'read');
    case OBSERVABILITY_ALERTING_RULE_LIBRARY_DEEP_LINK_ID:
      return hasObservabilityAlertingPrivilege(capabilities, ['rules'], 'all');
    case OBSERVABILITY_ALERTING_ACTION_POLICIES_DEEP_LINK_ID:
      return hasObservabilityAlertingPrivilege(capabilities, ['actionPolicies'], 'read');
    case OBSERVABILITY_ALERTING_EXECUTION_HISTORY_DEEP_LINK_ID:
      return hasObservabilityAlertingPrivilege(capabilities, ['executionHistory'], 'read');
    default:
      return false;
  }
};

/**
 * Observability Alerting deep links. When `capabilities` is passed, `visibleIn`
 * is restricted so global search only offers surfaces the user can open.
 */
export const getObservabilityAlertingDeepLinks = (capabilities?: Capabilities): AppDeepLink[] => {
  const deepLinks: AppDeepLink[] = [
    {
      id: OBSERVABILITY_ALERTING_ALERTS_DEEP_LINK_ID,
      title: i18n.translate('xpack.observabilityAlerting.deepLinks.alertsTitle', {
        defaultMessage: 'Alerts',
      }),
      path: OBSERVABILITY_ALERTING_ALERTS_PATH,
      visibleIn: SEARCHABLE_VISIBLE_IN,
      keywords: ['alerting', 'episodes', 'alerts', 'inbox'],
    },
    {
      id: OBSERVABILITY_ALERTING_RULES_V1_DEEP_LINK_ID,
      title: i18n.translate('xpack.observabilityAlerting.deepLinks.rulesV1Title', {
        defaultMessage: 'Rules (v1)',
      }),
      path: OBSERVABILITY_ALERTING_RULES_V1_PATH,
      visibleIn: SEARCHABLE_VISIBLE_IN,
      keywords: ['alerting', 'rules', 'classic', 'v1'],
    },
    {
      id: OBSERVABILITY_ALERTING_RULES_V2_DEEP_LINK_ID,
      title: i18n.translate('xpack.observabilityAlerting.deepLinks.rulesV2Title', {
        defaultMessage: 'Rules',
      }),
      path: OBSERVABILITY_ALERTING_RULES_V2_PATH,
      visibleIn: SEARCHABLE_VISIBLE_IN,
      keywords: ['alerting', 'rules', 'esql'],
    },
    {
      id: OBSERVABILITY_ALERTING_RULE_LIBRARY_DEEP_LINK_ID,
      title: i18n.translate('xpack.observabilityAlerting.deepLinks.ruleLibraryTitle', {
        defaultMessage: 'Rule Library',
      }),
      path: OBSERVABILITY_ALERTING_RULE_LIBRARY_PATH,
      visibleIn: SEARCHABLE_VISIBLE_IN,
      keywords: ['alerting', 'templates', 'library'],
    },
    {
      id: OBSERVABILITY_ALERTING_ACTION_POLICIES_DEEP_LINK_ID,
      title: i18n.translate('xpack.observabilityAlerting.deepLinks.actionPoliciesTitle', {
        defaultMessage: 'Action Policies',
      }),
      path: OBSERVABILITY_ALERTING_ACTION_POLICIES_PATH,
      visibleIn: SEARCHABLE_VISIBLE_IN,
      keywords: ['alerting', 'actions', 'policies'],
    },
    {
      id: OBSERVABILITY_ALERTING_EXECUTION_HISTORY_DEEP_LINK_ID,
      title: i18n.translate('xpack.observabilityAlerting.deepLinks.executionHistoryTitle', {
        defaultMessage: 'Execution History',
      }),
      path: OBSERVABILITY_ALERTING_EXECUTION_HISTORY_PATH,
      visibleIn: SEARCHABLE_VISIBLE_IN,
      keywords: ['alerting', 'history', 'executions'],
    },
  ];

  if (!capabilities) {
    return deepLinks;
  }

  return deepLinks.map((link) => ({
    ...link,
    visibleIn: canAccessDeepLink(link.id, capabilities) ? SEARCHABLE_VISIBLE_IN : [],
  }));
};
