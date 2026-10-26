/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import type { useHistory, useLocation } from 'react-router-dom';

import { ErrorsTab } from './errors/errors_tab';
import { OverviewPage } from './overview/overview_page';
import { MonitorManagementPage } from './monitors_page';
import type { RouteProps } from '../../routes';
import { ERRORS_ROUTE, MONITORS_ROUTE, OVERVIEW_ROUTE } from '../../../../../common/constants';

export const getMonitorsRoute = (
  _history: ReturnType<typeof useHistory>,
  _location: ReturnType<typeof useLocation>,
  _syntheticsPath: string,
  baseTitle: string
): RouteProps[] => {
  return [
    {
      title: i18n.translate('xpack.synthetics.overviewRoute.title', {
        defaultMessage: 'Synthetics Overview | {baseTitle}',
        values: { baseTitle },
      }),
      path: OVERVIEW_ROUTE,
      component: OverviewPage,
      dataTestSubj: 'syntheticsOverviewPage',
    },
    {
      title: i18n.translate('xpack.synthetics.monitorManagementRoute.title', {
        defaultMessage: 'Synthetics Management | {baseTitle}',
        values: { baseTitle },
      }),
      path: MONITORS_ROUTE,
      component: MonitorManagementPage,
      dataTestSubj: 'syntheticsMonitorManagementPage',
    },
    {
      title: i18n.translate('xpack.synthetics.errorRoute.title', {
        defaultMessage: 'Errors | {baseTitle}',
        values: { baseTitle },
      }),
      path: ERRORS_ROUTE,
      component: ErrorsTab,
      dataTestSubj: 'syntheticsErrorPage',
    },
  ];
};
