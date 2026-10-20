/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AppHeaderTab } from '@kbn/app-header';
import { i18n } from '@kbn/i18n';
import {
  MONITOR_ALERTS_ROUTE,
  MONITOR_ERRORS_ROUTE,
  MONITOR_HISTORY_ROUTE,
  MONITOR_ROUTE,
} from '../../../../../common/constants';

export type MonitorDetailsTab = 'overview' | 'history' | 'errors' | 'alerts';

const ALERTS_LABEL = i18n.translate('xpack.synthetics.monitorAlertsTab.title', {
  defaultMessage: 'Alerts',
});

const ALERTS_DISABLED_TOOLTIP = i18n.translate(
  'xpack.synthetics.monitorAlertsTab.disabledTooltip',
  {
    defaultMessage: 'Alerts are not available for read-only monitors',
  }
);

export function getMonitorDetailsAppHeaderTabs({
  syntheticsPath,
  selectedTab,
  monitorId,
  search,
  isReadOnly,
  hasActiveError,
  numberOfActiveAlerts,
}: {
  syntheticsPath: string;
  selectedTab: MonitorDetailsTab;
  monitorId: string;
  search: string;
  isReadOnly: boolean;
  hasActiveError?: boolean;
  numberOfActiveAlerts?: number;
}): AppHeaderTab[] {
  return [
    {
      id: 'overview',
      label: i18n.translate('xpack.synthetics.monitorOverviewTab.title', {
        defaultMessage: 'Overview',
      }),
      isSelected: selectedTab === 'overview',
      href: `${syntheticsPath}${MONITOR_ROUTE.replace(':monitorId?', monitorId)}${search}`,
      'data-test-subj': 'syntheticsMonitorOverviewTab',
    },
    {
      id: 'history',
      label: i18n.translate('xpack.synthetics.monitorHistoryTab.title', {
        defaultMessage: 'History',
      }),
      isSelected: selectedTab === 'history',
      href: `${syntheticsPath}${MONITOR_HISTORY_ROUTE.replace(':monitorId', monitorId)}${search}`,
      'data-test-subj': 'syntheticsMonitorHistoryTab',
    },
    {
      id: 'errors',
      label: i18n.translate('xpack.synthetics.monitorErrorsTab.title', {
        defaultMessage: 'Errors',
      }),
      isSelected: selectedTab === 'errors',
      href: `${syntheticsPath}${MONITOR_ERRORS_ROUTE.replace(':monitorId', monitorId)}${search}`,
      'data-test-subj': 'syntheticsMonitorErrorsTab',
      badge: hasActiveError ? { iconType: 'warning' } : undefined,
    },
    {
      id: 'alerts',
      label: ALERTS_LABEL,
      isSelected: selectedTab === 'alerts',
      href: isReadOnly
        ? undefined
        : `${syntheticsPath}${MONITOR_ALERTS_ROUTE.replace(':monitorId', monitorId)}${search}`,
      'data-test-subj': 'syntheticsMonitorAlertsTab',
      disabled: isReadOnly,
      toolTipContent: isReadOnly ? ALERTS_DISABLED_TOOLTIP : undefined,
      badge: !isReadOnly && numberOfActiveAlerts ? numberOfActiveAlerts : undefined,
    },
  ];
}
