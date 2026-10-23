/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AppDeepLink, AppDeepLinkLocations, Capabilities } from '@kbn/core/public';
import { i18n } from '@kbn/i18n';
import { hasObservabilityCapabilities } from '@kbn/observability-shared-plugin/public';
import {
  getObservabilityRulesTabVisibility,
  hasObservabilityAlertingCapabilities,
} from './application/has_observability_alerting_privilege';
import {
  OBSERVABILITY_ALERTING_ACTION_POLICIES_DEEP_LINK_ID,
  OBSERVABILITY_ALERTING_ACTION_POLICIES_PATH,
  OBSERVABILITY_ALERTING_ALERTS_DEEP_LINK_ID,
  OBSERVABILITY_ALERTING_ALERTS_ORDER,
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
const PROJECT_SIDE_NAV_ONLY_VISIBLE_IN: AppDeepLinkLocations[] = ['projectSideNav'];
const RULES_V1_KEYWORDS = ['classic', 'v1'];
const RULES_V2_KEYWORDS = ['alerting', 'rules', 'esql'];

type DeepLinkOverride = Partial<Pick<AppDeepLink, 'title' | 'visibleIn' | 'keywords'>>;

const getRulesDeepLinkOverrides = (
  capabilities: Capabilities
): Partial<Record<string, DeepLinkOverride>> => {
  const { showV1, showV2 } = getObservabilityRulesTabVisibility(capabilities);

  if (showV1 && showV2) {
    // Classic and Universal share one Rules page, so search offers only the Universal entry.
    return {
      [OBSERVABILITY_ALERTING_RULES_V1_DEEP_LINK_ID]: {
        visibleIn: PROJECT_SIDE_NAV_ONLY_VISIBLE_IN,
      },
      [OBSERVABILITY_ALERTING_RULES_V2_DEEP_LINK_ID]: {
        keywords: [...RULES_V2_KEYWORDS, ...RULES_V1_KEYWORDS],
      },
    };
  }

  if (showV1) {
    return {
      [OBSERVABILITY_ALERTING_RULES_V1_DEEP_LINK_ID]: {
        title: i18n.translate('xpack.observabilityAlerting.deepLinks.rulesV1OnlyTitle', {
          defaultMessage: 'Rules',
        }),
      },
    };
  }

  return {};
};

/**
 * Same gate as the Observability classic nav (`updateGlobalNavigation`), plus Alerting v2 alerts
 * read. Alerts is the only entry listed in the classic hamburger.
 */
const canListInClassicSideNav = (capabilities: Capabilities): boolean =>
  hasObservabilityAlertingCapabilities(capabilities, 'alerts').v2 ||
  hasObservabilityCapabilities(capabilities);

const canAccessDeepLink = (id: string, capabilities: Capabilities): boolean => {
  switch (id) {
    case OBSERVABILITY_ALERTING_ALERTS_DEEP_LINK_ID: {
      const { v1, v2 } = hasObservabilityAlertingCapabilities(capabilities, 'alerts');
      return v1 || v2;
    }
    case OBSERVABILITY_ALERTING_RULES_V1_DEEP_LINK_ID: {
      const { v1 } = hasObservabilityAlertingCapabilities(capabilities, 'rules');
      return v1;
    }
    case OBSERVABILITY_ALERTING_RULES_V2_DEEP_LINK_ID:
    case OBSERVABILITY_ALERTING_RULE_LIBRARY_DEEP_LINK_ID: {
      const { v2 } = hasObservabilityAlertingCapabilities(capabilities, 'rules');
      return v2;
    }
    case OBSERVABILITY_ALERTING_ACTION_POLICIES_DEEP_LINK_ID: {
      const { v2 } = hasObservabilityAlertingCapabilities(capabilities, 'actionPolicies');
      return v2;
    }
    case OBSERVABILITY_ALERTING_EXECUTION_HISTORY_DEEP_LINK_ID: {
      const { v2 } = hasObservabilityAlertingCapabilities(capabilities, 'executionHistory');
      return v2;
    }
    default:
      return false;
  }
};

const getAccessibleVisibleIn = (
  link: AppDeepLink,
  capabilities: Capabilities
): AppDeepLinkLocations[] => {
  if (!canAccessDeepLink(link.id, capabilities)) {
    return [];
  }

  if (
    link.id === OBSERVABILITY_ALERTING_ALERTS_DEEP_LINK_ID &&
    canListInClassicSideNav(capabilities)
  ) {
    return [...SEARCHABLE_VISIBLE_IN, 'classicSideNav'];
  }

  return SEARCHABLE_VISIBLE_IN;
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
      order: OBSERVABILITY_ALERTING_ALERTS_ORDER,
      visibleIn: SEARCHABLE_VISIBLE_IN,
      keywords: ['alerting', 'episodes', 'alerts', 'inbox'],
    },
    {
      id: OBSERVABILITY_ALERTING_RULES_V1_DEEP_LINK_ID,
      title: i18n.translate('xpack.observabilityAlerting.deepLinks.rulesV1Title', {
        defaultMessage: 'Rules (V1)',
      }),
      path: OBSERVABILITY_ALERTING_RULES_V1_PATH,
      visibleIn: SEARCHABLE_VISIBLE_IN,
      keywords: ['alerting', 'rules', ...RULES_V1_KEYWORDS],
    },
    {
      id: OBSERVABILITY_ALERTING_RULES_V2_DEEP_LINK_ID,
      title: i18n.translate('xpack.observabilityAlerting.deepLinks.rulesV2Title', {
        defaultMessage: 'Rules',
      }),
      path: OBSERVABILITY_ALERTING_RULES_V2_PATH,
      visibleIn: SEARCHABLE_VISIBLE_IN,
      keywords: RULES_V2_KEYWORDS,
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

  const overrides = getRulesDeepLinkOverrides(capabilities);

  return deepLinks.map((link) => ({
    ...link,
    visibleIn: getAccessibleVisibleIn(link, capabilities),
    ...overrides[link.id],
  }));
};
