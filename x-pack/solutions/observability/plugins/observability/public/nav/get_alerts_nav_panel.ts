/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PanelOpenerChildDefinition, RootNodeDefinition } from '@kbn/core-chrome-browser';
import type { CoreStart } from '@kbn/core/public';
import { i18n } from '@kbn/i18n';
import {
  hasAlertingV2Capability,
  isAlertingV2Enabled,
  shouldShowClassicObservabilityAlertsTable,
} from '@kbn/alerting-v2-utils';
import {
  OBSERVABILITY_ALERTING_APP_ID,
  type ObservabilityAlertingLinkId,
} from '@kbn/deeplinks-observability';
import { hasObservabilityCapabilities } from '@kbn/observability-shared-plugin/public';

const PANEL_ID = 'alerting';
const ALERTS_LINK = 'observability-overview:alerts' as const;
const ALERTS_ICON = 'warning';
const V1_RULES_MANAGEMENT_ID = 'triggersActionsRules';
const MAINTENANCE_WINDOWS_MANAGEMENT_ID = 'maintenanceWindows';

const obsAlertingLink = (deepLinkId: ObservabilityAlertingLinkId) =>
  `${OBSERVABILITY_ALERTING_APP_ID}:${deepLinkId}` as const;

const getAlertsIsActive: NonNullable<RootNodeDefinition['getIsActive']> = ({
  pathNameSerialized,
  prepend,
}) =>
  pathNameSerialized.startsWith(prepend('/app/observability/alerting')) ||
  pathNameSerialized.startsWith(prepend('/app/observability/alerts'));

const hasManagementCapability = (core: CoreStart, capabilityId: string): boolean =>
  core.application.capabilities.management?.insightsAndAlerting?.[capabilityId] === true;

/**
 * Same gate as classic nav (`updateGlobalNavigation` / `hasObservabilityCapabilities`):
 * any Observability app capability, not alerting-specific privileges.
 */
const canReadV1Alerts = (core: CoreStart): boolean =>
  hasObservabilityCapabilities(core.application.capabilities);

const canReadV1Rules = (core: CoreStart): boolean =>
  hasManagementCapability(core, V1_RULES_MANAGEMENT_ID);

const maybeSection = (
  children: PanelOpenerChildDefinition[],
  section: Omit<PanelOpenerChildDefinition, 'children'>
): PanelOpenerChildDefinition[] => {
  if (children.length === 0) {
    return [];
  }

  return [{ ...section, children }];
};

const getAlertsSection = (core: CoreStart): PanelOpenerChildDefinition[] => {
  const alertsChildren: PanelOpenerChildDefinition[] = [];

  if (hasAlertingV2Capability(core, 'alerts') || canReadV1Alerts(core)) {
    alertsChildren.push({
      link: obsAlertingLink('alerts'),
      title: i18n.translate('xpack.observability.nav.alerts', {
        defaultMessage: 'Alerts',
      }),
    });
  }

  if (canReadV1Alerts(core) && shouldShowClassicObservabilityAlertsTable(core)) {
    alertsChildren.push({
      link: ALERTS_LINK,
      title: i18n.translate('xpack.observability.nav.alertsV1', {
        defaultMessage: 'Alerts (V1)',
      }),
    });
  }

  return maybeSection(alertsChildren, { breadcrumbStatus: 'hidden' });
};

const getRuleManagementSection = (core: CoreStart): PanelOpenerChildDefinition[] => {
  const canReadV2Rules = hasAlertingV2Capability(core, 'rules');
  const canReadClassicRules = canReadV1Rules(core);

  if (!canReadV2Rules && !canReadClassicRules) {
    return [];
  }

  const rulesChildren: PanelOpenerChildDefinition[] = [];

  if (canReadV2Rules) {
    rulesChildren.push({ link: obsAlertingLink('rules-v2') });
    rulesChildren.push({ link: obsAlertingLink('rules-v1'), sideNavStatus: 'hidden' });
  } else {
    rulesChildren.push({
      link: obsAlertingLink('rules-v1'),
      title: i18n.translate('xpack.observability.nav.rulesV1', { defaultMessage: 'Rules' }),
    });
  }

  return maybeSection(rulesChildren, {
    title: i18n.translate('xpack.observability.nav.ruleManagement', {
      defaultMessage: 'Rule Management',
    }),
    breadcrumbStatus: 'hidden',
  });
};

// Side nav renders at most two `new` badges per panel. Those slots are Action policies and Execution history.
const getNotificationsSection = (core: CoreStart): PanelOpenerChildDefinition[] => {
  const notificationsChildren: PanelOpenerChildDefinition[] = [];

  if (hasAlertingV2Capability(core, 'actionPolicies')) {
    notificationsChildren.push({
      link: obsAlertingLink('action-policies'),
      badgeType: 'new',
    });
  }

  if (hasManagementCapability(core, MAINTENANCE_WINDOWS_MANAGEMENT_ID)) {
    notificationsChildren.push({ link: 'management:maintenanceWindows' });
  }

  return maybeSection(notificationsChildren, {
    title: i18n.translate('xpack.observability.nav.notificationsAndSuppressions', {
      defaultMessage: 'Notifications and Suppressions',
    }),
    breadcrumbStatus: 'hidden',
  });
};

const getOperationsSection = (core: CoreStart): PanelOpenerChildDefinition[] => {
  if (!hasAlertingV2Capability(core, 'executionHistory')) {
    return [];
  }

  return maybeSection(
    [
      {
        link: obsAlertingLink('execution-history'),
        badgeType: 'new',
      },
    ],
    {
      title: i18n.translate('xpack.observability.nav.operations', {
        defaultMessage: 'Operations',
      }),
      breadcrumbStatus: 'hidden',
    }
  );
};

/**
 * While v2 is off, `getAlertsNavPanel` only returns the classic Alerts link.
 * Stack Management Rules is then the only project-nav path to the Rules page.
 */
export const shouldIncludeStackManagementRules = (core: CoreStart): boolean =>
  !isAlertingV2Enabled(core);

export const getAlertsNavPanel = (core: CoreStart): RootNodeDefinition[] => {
  if (!isAlertingV2Enabled(core)) {
    return [{ link: ALERTS_LINK, icon: ALERTS_ICON, getIsActive: getAlertsIsActive }];
  }

  const children = [
    ...getAlertsSection(core),
    ...getRuleManagementSection(core),
    ...getNotificationsSection(core),
    ...getOperationsSection(core),
  ];

  if (children.length === 0) {
    return [];
  }

  return [
    {
      id: PANEL_ID,
      title: i18n.translate('xpack.observability.nav.alerting', {
        defaultMessage: 'Alerting',
      }),
      // No parent `link`: chrome removes the whole node when that deep link is
      // missing from navLinks. V2-only users cannot access the classic alerts
      // route, so bind visibility to children (same pattern as Applications).
      icon: ALERTS_ICON,
      renderAs: 'panelOpener',
      getIsActive: getAlertsIsActive,
      children,
    },
  ];
};
