/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import type { useHistory } from 'react-router-dom';
import { MonitorDetailsAlerts } from './monitor_alerts/monitor_detail_alerts';
import { MonitorNotFoundPage } from './monitor_not_found_page';
import { MonitorErrors } from './monitor_errors/monitor_errors';
import { MonitorHistory } from './monitor_history/monitor_history';
import { MonitorSummary } from './monitor_summary/monitor_summary';
import {
  MONITOR_ALERTS_ROUTE,
  MONITOR_ERRORS_ROUTE,
  MONITOR_HISTORY_ROUTE,
  MONITOR_NOT_FOUND_ROUTE,
  MONITOR_ROUTE,
} from '../../../../../common/constants';
import type { RouteProps } from '../../routes';

export const getMonitorDetailsRoute = (
  _history: ReturnType<typeof useHistory>,
  _syntheticsPath: string,
  baseTitle: string
): RouteProps[] => {
  return [
    {
      title: i18n.translate('xpack.synthetics.monitorDetails.title', {
        defaultMessage: 'Synthetics Monitor Details | {baseTitle}',
        values: { baseTitle },
      }),
      path: MONITOR_ROUTE,
      component: MonitorSummary,
      dataTestSubj: 'syntheticsMonitorDetailsPage',
    },
    {
      title: i18n.translate('xpack.synthetics.monitorHistory.title', {
        defaultMessage: 'Synthetics Monitor History | {baseTitle}',
        values: { baseTitle },
      }),
      path: MONITOR_HISTORY_ROUTE,
      component: MonitorHistory,
      dataTestSubj: 'syntheticsMonitorHistoryPage',
    },
    {
      title: i18n.translate('xpack.synthetics.monitorErrors.title', {
        defaultMessage: 'Synthetics Monitor Errors | {baseTitle}',
        values: { baseTitle },
      }),
      path: MONITOR_ERRORS_ROUTE,
      component: MonitorErrors,
      dataTestSubj: 'syntheticsMonitorHistoryPage',
    },
    {
      title: i18n.translate('xpack.synthetics.monitorErrors.title', {
        defaultMessage: 'Synthetics Monitor Alerts | {baseTitle}',
        values: { baseTitle },
      }),
      path: MONITOR_ALERTS_ROUTE,
      component: MonitorDetailsAlerts,
      dataTestSubj: 'syntheticsMonitorAlertsPage',
    },
    {
      title: i18n.translate('xpack.synthetics.monitorNotFound.title', {
        defaultMessage: 'Synthetics Monitor Not Found | {baseTitle}',
        values: { baseTitle },
      }),
      path: MONITOR_NOT_FOUND_ROUTE,
      component: MonitorNotFoundPage,
      dataTestSubj: 'syntheticsMonitorNotFoundPage',
    },
  ];
};
