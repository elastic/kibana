/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RootNodeDefinition } from '@kbn/core-chrome-browser';
import { i18n } from '@kbn/i18n';

/**
 * Prototype Observability solution nav for Alerting v1 + v2 in one place.
 * v2 destinations are the Stack Management apps (Alerting v2 preview).
 * Renders as a panel opener so section titles show in the secondary menu.
 */
export const getAlertingSolutionNavItem = ({
  showAlertsV1 = false,
}: {
  showAlertsV1?: boolean;
} = {}): RootNodeDefinition => ({
  id: 'alerting',
  title: i18n.translate('xpack.observability.obltNav.alerting', {
    defaultMessage: 'Alerting',
  }),
  icon: 'warning',
  renderAs: 'panelOpener',
  children: [
    {
      id: 'alerting_inbox',
      title: '',
      children: [
        {
          id: 'alerting_inbox_page',
          link: 'management:episodes',
          title: i18n.translate('xpack.observability.obltNav.alerting.inbox', {
            defaultMessage: 'Inbox',
          }),
          badgeType: 'new',
        },
        ...(showAlertsV1
          ? [
              {
                id: 'alerting_alerts_v1',
                link: 'observability-overview:alerts' as const,
                title: i18n.translate('xpack.observability.obltNav.alerting.alertsV1', {
                  defaultMessage: 'Alerts',
                }),
              },
            ]
          : []),
      ],
    },
    {
      id: 'alerting_rule_management',
      title: i18n.translate('xpack.observability.obltNav.alerting.ruleManagement', {
        defaultMessage: 'Rule management',
      }),
      children: [
        {
          link: 'management:rules',
          title: i18n.translate('xpack.observability.obltNav.alerting.rules', {
            defaultMessage: 'Rules',
          }),
          children: [
            {
              link: 'management:triggersActions',
              sideNavStatus: 'hidden',
            },
          ],
        },
        {
          id: 'alerting_rules_library',
          link: 'management:rule_library',
          title: i18n.translate('xpack.observability.obltNav.alerting.rulesLibrary', {
            defaultMessage: 'Rules library',
          }),
          badgeType: 'new',
        },
      ],
    },
    {
      id: 'alerting_slos',
      title: i18n.translate('xpack.observability.obltNav.alerting.slos', {
        defaultMessage: 'SLOs',
      }),
      children: [
        {
          link: 'slo',
          title: i18n.translate('xpack.observability.obltNav.alerting.slosList', {
            defaultMessage: 'SLOs',
          }),
        },
        {
          link: 'slo:management',
          title: i18n.translate('xpack.observability.obltNav.alerting.manageSlos', {
            defaultMessage: 'Manage SLOs',
          }),
        },
        {
          link: 'slo:settings',
          title: i18n.translate('xpack.observability.obltNav.alerting.sloSettings', {
            defaultMessage: 'Settings',
          }),
        },
      ],
    },
    {
      id: 'alerting_notifications',
      title: i18n.translate('xpack.observability.obltNav.alerting.notifications', {
        defaultMessage: 'Notifications & suppressions',
      }),
      children: [
        {
          id: 'alerting_action_policies',
          link: 'management:action_policies',
          title: i18n.translate('xpack.observability.obltNav.alerting.actionPolicies', {
            defaultMessage: 'Action Policies',
          }),
          badgeType: 'new',
        },
        {
          link: 'management:maintenanceWindows',
          title: i18n.translate('xpack.observability.obltNav.alerting.maintenanceWindow', {
            defaultMessage: 'Maintenance window',
          }),
        },
      ],
    },
    {
      id: 'alerting_operations',
      title: i18n.translate('xpack.observability.obltNav.alerting.operations', {
        defaultMessage: 'Operations',
      }),
      children: [
        {
          id: 'alerting_execution_history',
          link: 'management:execution_history',
          title: i18n.translate('xpack.observability.obltNav.alerting.executionHistory', {
            defaultMessage: 'Execution history',
          }),
          badgeType: 'new',
        },
      ],
    },
  ],
});
