/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreStart } from '@kbn/core/public';
import { i18n } from '@kbn/i18n';
import {
  hasAlertingV2Capability,
  isAlertingV2Enabled,
  shouldShowV1ObservabilityAlertsTable,
} from '@kbn/alerting-v2-utils';
import {
  OBSERVABILITY_ALERTING_ACTION_POLICIES_PATH,
  OBSERVABILITY_ALERTING_ALERTS_PATH,
  OBSERVABILITY_ALERTING_APP_ID,
  OBSERVABILITY_ALERTING_EXECUTION_HISTORY_PATH,
  OBSERVABILITY_ALERTING_RULE_LIBRARY_PATH,
} from '@kbn/deeplinks-observability';
import type { NavigationEntry, NavigationSection } from '@kbn/observability-shared-plugin/public';
import { observabilityAppId } from '../../common';
import { ALERTS_PATH } from '../../common/locators/paths';
import { canReadV1Alerts, getObservabilityAlertsLinkTitle } from './get_alerts_nav_panel';

// Directly below the Overview section (100), before the remaining top entries (102) and Streams (103).
const ALERTING_SECTION_SORT_KEY = 101;

const getAlertingEntries = (core: CoreStart): NavigationEntry[] => {
  const entries: NavigationEntry[] = [];

  if (hasAlertingV2Capability(core, 'alerts') || canReadV1Alerts(core)) {
    entries.push({
      label: i18n.translate('xpack.observability.nav.alerts', { defaultMessage: 'Alerts' }),
      app: OBSERVABILITY_ALERTING_APP_ID,
      path: OBSERVABILITY_ALERTING_ALERTS_PATH,
    });
  }

  if (canReadV1Alerts(core) && shouldShowV1ObservabilityAlertsTable(core)) {
    entries.push({
      label: getObservabilityAlertsLinkTitle(true),
      app: observabilityAppId,
      path: ALERTS_PATH,
    });
  }

  if (hasAlertingV2Capability(core, 'rules')) {
    entries.push({
      label: i18n.translate('xpack.observability.nav.ruleLibrary', {
        defaultMessage: 'Rule Library',
      }),
      app: OBSERVABILITY_ALERTING_APP_ID,
      path: OBSERVABILITY_ALERTING_RULE_LIBRARY_PATH,
    });
  }

  if (hasAlertingV2Capability(core, 'actionPolicies')) {
    entries.push({
      label: i18n.translate('xpack.observability.nav.actionPolicies', {
        defaultMessage: 'Action Policies',
      }),
      app: OBSERVABILITY_ALERTING_APP_ID,
      path: OBSERVABILITY_ALERTING_ACTION_POLICIES_PATH,
    });
  }

  if (hasAlertingV2Capability(core, 'executionHistory')) {
    entries.push({
      label: i18n.translate('xpack.observability.nav.executionHistory', {
        defaultMessage: 'Execution History',
      }),
      app: OBSERVABILITY_ALERTING_APP_ID,
      path: OBSERVABILITY_ALERTING_EXECUTION_HISTORY_PATH,
    });
  }

  return entries;
};

/**
 * Labeled "Alerting" section for the classic Observability in-app sub-nav.
 * Empty while Alerting v2 is off or when the user can open none of its entries.
 */
export const getAlertingClassicNavSection = (core: CoreStart): NavigationSection[] => {
  if (!isAlertingV2Enabled(core)) {
    return [];
  }

  const entries = getAlertingEntries(core);

  if (entries.length === 0) {
    return [];
  }

  return [
    {
      label: i18n.translate('xpack.observability.nav.alerting', { defaultMessage: 'Alerting' }),
      sortKey: ALERTING_SECTION_SORT_KEY,
      entries,
    },
  ];
};
