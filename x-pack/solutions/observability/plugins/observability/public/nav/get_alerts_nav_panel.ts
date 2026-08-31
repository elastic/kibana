/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RootNodeDefinition } from '@kbn/core-chrome-browser';
import type { CoreStart } from '@kbn/core-lifecycle-browser';
import { i18n } from '@kbn/i18n';
import { isAlertingV2Enabled } from '@kbn/alerting-v2-utils';

const PANEL_ID = 'alerting';
const ALERTS_LINK = 'observability-overview:alerts' as const;
const ALERTS_ICON = 'warning';

/**
 * Returns the solution-nav Alerts entry for Observability.
 *
 * When `alerting:v2:enabled` is false, returns a plain Alerts link.
 * When true, returns a panel opener whose flyout contains Inbox
 * (alerting v2 episodes), Alerts V1 (classic alerts), Notifications
 * and Suppressions, and Operations.
 *
 * Spread into a navigation tree `body`:
 *
 * ```ts
 * ...getAlertsNavPanel(core),
 * ```
 */
export const getAlertsNavPanel = (core: CoreStart): RootNodeDefinition[] => {
  if (!isAlertingV2Enabled(core)) {
    return [{ link: ALERTS_LINK, icon: ALERTS_ICON }];
  }

  return [
    {
      id: PANEL_ID,
      link: ALERTS_LINK,
      icon: ALERTS_ICON,
      renderAs: 'panelOpener',
      children: [
        {
          breadcrumbStatus: 'hidden' as const,
          children: [
            {
              link: 'management:episodes' as const,
              title: i18n.translate('xpack.observability.nav.inbox', {
                defaultMessage: 'Inbox',
              }),
            },
            {
              link: ALERTS_LINK,
              title: i18n.translate('xpack.observability.nav.alertsV1', {
                defaultMessage: 'Alerts V1',
              }),
            },
          ],
        },
        {
          title: i18n.translate('xpack.observability.nav.ruleManagement', {
            defaultMessage: 'Rule Management',
          }),
          breadcrumbStatus: 'hidden' as const,
          children: [
            { link: 'management:rules' as const },
            { link: 'management:rule_library' as const },
          ],
        },
        {
          title: i18n.translate('xpack.observability.nav.notificationsAndSuppressions', {
            defaultMessage: 'Notifications and Suppressions',
          }),
          breadcrumbStatus: 'hidden' as const,
          children: [
            { link: 'management:action_policies' as const },
            { link: 'management:maintenanceWindows' as const },
          ],
        },
        {
          title: i18n.translate('xpack.observability.nav.operations', {
            defaultMessage: 'Operations',
          }),
          breadcrumbStatus: 'hidden' as const,
          children: [{ link: 'management:execution_history' as const }],
        },
      ],
    },
  ];
};
