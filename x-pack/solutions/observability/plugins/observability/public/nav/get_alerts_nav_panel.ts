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

const OBS_ALERTING_APP = 'observabilityAlerting';
const obsAlertingLink = (deepLinkId: string) => `${OBS_ALERTING_APP}:${deepLinkId}` as const;

const getAlertsIsActive: NonNullable<RootNodeDefinition['getIsActive']> = ({
  pathNameSerialized,
  prepend,
}) =>
  pathNameSerialized.startsWith(prepend('/app/observability/alerting')) ||
  pathNameSerialized.startsWith(prepend('/app/observability/alerts'));

export const getAlertsNavPanel = (core: CoreStart): RootNodeDefinition[] => {
  if (!isAlertingV2Enabled(core)) {
    return [{ link: ALERTS_LINK, icon: ALERTS_ICON, getIsActive: getAlertsIsActive }];
  }

  return [
    {
      id: PANEL_ID,
      link: ALERTS_LINK,
      icon: ALERTS_ICON,
      renderAs: 'panelOpener',
      getIsActive: getAlertsIsActive,
      children: [
        {
          breadcrumbStatus: 'hidden' as const,
          children: [
            {
              link: obsAlertingLink('inbox'),
              title: i18n.translate('xpack.observability.nav.inbox', {
                defaultMessage: 'Inbox',
              }),
              badgeType: 'new' as const,
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
            { link: obsAlertingLink('rules-v2') },
            {
              link: obsAlertingLink('rule-library'),
              badgeType: 'new' as const,
            },
          ],
        },
        {
          title: i18n.translate('xpack.observability.nav.notificationsAndSuppressions', {
            defaultMessage: 'Notifications and Suppressions',
          }),
          breadcrumbStatus: 'hidden' as const,
          children: [
            {
              link: obsAlertingLink('action-policies'),
              badgeType: 'new' as const,
            },
            { link: 'management:maintenanceWindows' as const },
          ],
        },
        {
          title: i18n.translate('xpack.observability.nav.operations', {
            defaultMessage: 'Operations',
          }),
          breadcrumbStatus: 'hidden' as const,
          children: [
            {
              link: obsAlertingLink('execution-history'),
              badgeType: 'new' as const,
            },
          ],
        },
      ],
    },
  ];
};
