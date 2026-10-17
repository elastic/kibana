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
  shouldShowV1ObservabilityAlertsTable,
} from '@kbn/alerting-v2-utils';
import {
  OBSERVABILITY_ALERTING_APP_ID,
  type ObservabilityAlertingLinkId,
} from '@kbn/deeplinks-observability';
import { hasObservabilityCapabilities } from '@kbn/observability-shared-plugin/public';

const PANEL_ID = 'alerting';
const ALERTS_LINK = 'observability-overview:alerts' as const;
const STACK_MANAGEMENT_RULES_LINK = 'management:triggersActions' as const;
const ALERTS_ICON = 'warning';

/** Classic Observability alerts label for nav and global search. */
export const getObservabilityAlertsLinkTitle = (alertingV2Enabled: boolean): string =>
  alertingV2Enabled
    ? i18n.translate('xpack.observability.nav.alertsClassic', {
        defaultMessage: 'Alerts (Classic)',
      })
    : i18n.translate('xpack.observability.alertsLinkTitle', {
        defaultMessage: 'Alerts',
      });
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
export const canReadV1Alerts = (core: CoreStart): boolean =>
  hasObservabilityCapabilities(core.application.capabilities);

/** Gate for the Classic rules link in the Alerting panel. */
export const canReadV1Rules = (core: CoreStart): boolean =>
  hasManagementCapability(core, V1_RULES_MANAGEMENT_ID);

/** Gate for the Maintenance windows link in the Alerting panel. */
export const canReadMaintenanceWindows = (core: CoreStart): boolean =>
  hasManagementCapability(core, MAINTENANCE_WINDOWS_MANAGEMENT_ID);

const maybeSection = (
  children: PanelOpenerChildDefinition[],
  section: Omit<PanelOpenerChildDefinition, 'children'>
): PanelOpenerChildDefinition[] => {
  if (children.length === 0) {
    return [];
  }

  return [{ ...section, children }];
};

const getAlertsChildren = (core: CoreStart, isV2Enabled: boolean): PanelOpenerChildDefinition[] => {
  if (!isV2Enabled) {
    return canReadV1Alerts(core)
      ? [{ link: ALERTS_LINK, title: getObservabilityAlertsLinkTitle(false) }]
      : [];
  }

  const alertsChildren: PanelOpenerChildDefinition[] = [];

  if (hasAlertingV2Capability(core, 'alerts') || canReadV1Alerts(core)) {
    alertsChildren.push({
      link: obsAlertingLink('alerts'),
      title: i18n.translate('xpack.observability.nav.alerts', {
        defaultMessage: 'Alerts',
      }),
    });
  }

  if (canReadV1Alerts(core) && shouldShowV1ObservabilityAlertsTable(core)) {
    alertsChildren.push({
      link: ALERTS_LINK,
      title: getObservabilityAlertsLinkTitle(true),
    });
  }

  return alertsChildren;
};

const getAlertsSection = (core: CoreStart, isV2Enabled: boolean): PanelOpenerChildDefinition[] =>
  maybeSection(getAlertsChildren(core, isV2Enabled), { breadcrumbStatus: 'hidden' });

const getRulesTitle = (): string =>
  i18n.translate('xpack.observability.nav.rulesV1', { defaultMessage: 'Rules' });

const getRulesChildren = (core: CoreStart, isV2Enabled: boolean): PanelOpenerChildDefinition[] => {
  if (!isV2Enabled) {
    return canReadV1Rules(core)
      ? [{ link: STACK_MANAGEMENT_RULES_LINK, title: getRulesTitle() }]
      : [];
  }

  if (hasAlertingV2Capability(core, 'rules')) {
    return [
      { link: obsAlertingLink('rules-v2') },
      { link: obsAlertingLink('rules-v1'), sideNavStatus: 'hidden' },
    ];
  }

  return canReadV1Rules(core)
    ? [{ link: obsAlertingLink('rules-v1'), title: getRulesTitle() }]
    : [];
};

const getRuleManagementSection = (
  core: CoreStart,
  isV2Enabled: boolean
): PanelOpenerChildDefinition[] =>
  maybeSection(getRulesChildren(core, isV2Enabled), {
    title: i18n.translate('xpack.observability.nav.ruleManagement', {
      defaultMessage: 'Rule Management',
    }),
    breadcrumbStatus: 'hidden',
  });

// Side nav renders at most two `new` badges per panel. Those slots are Action policies and Execution history.
const getNotificationsSection = (
  core: CoreStart,
  isV2Enabled: boolean
): PanelOpenerChildDefinition[] => {
  const notificationsChildren: PanelOpenerChildDefinition[] = [];

  if (isV2Enabled && hasAlertingV2Capability(core, 'actionPolicies')) {
    notificationsChildren.push({
      link: obsAlertingLink('action-policies'),
      badgeType: 'new',
    });
  }

  if (canReadMaintenanceWindows(core)) {
    notificationsChildren.push({ link: 'management:maintenanceWindows' });
  }

  return maybeSection(notificationsChildren, {
    title: i18n.translate('xpack.observability.nav.notificationsAndSuppressions', {
      defaultMessage: 'Notifications and Suppressions',
    }),
    breadcrumbStatus: 'hidden',
  });
};

const getOperationsSection = (
  core: CoreStart,
  isV2Enabled: boolean
): PanelOpenerChildDefinition[] => {
  if (!isV2Enabled || !hasAlertingV2Capability(core, 'executionHistory')) {
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
 * Alerting panel for the Observability solution nav and serverless. While v2 is off,
 * it only links to pages that exist without the `observabilityAlerting` app.
 */
export const getAlertsNavPanel = (core: CoreStart): RootNodeDefinition[] => {
  const isV2Enabled = isAlertingV2Enabled(core);
  const children = [
    ...getAlertsSection(core, isV2Enabled),
    ...getRuleManagementSection(core, isV2Enabled),
    ...getNotificationsSection(core, isV2Enabled),
    ...getOperationsSection(core, isV2Enabled),
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
