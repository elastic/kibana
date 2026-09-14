/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AppHeaderTab } from '@kbn/app-header';
import { i18n } from '@kbn/i18n';
import { ERRORS_ROUTE, MONITORS_ROUTE, OVERVIEW_ROUTE } from '../../../../../../common/constants';

export const getMonitorsAppHeaderTabs = (
  syntheticsPath: string,
  selected: 'overview' | 'management' | 'errors',
  search: string
): AppHeaderTab[] => [
  {
    id: 'overview',
    label: i18n.translate('xpack.synthetics.monitorManagement.overviewTab.title', {
      defaultMessage: 'Overview',
    }),
    href: `${syntheticsPath}${OVERVIEW_ROUTE}${search}`,
    isSelected: selected === 'overview',
    'data-test-subj': 'syntheticsMonitorOverviewTab',
  },
  {
    id: 'management',
    label: i18n.translate('xpack.synthetics.monitorManagement.monitorsTab.title', {
      defaultMessage: 'Management',
    }),
    href: `${syntheticsPath}${MONITORS_ROUTE}${search}`,
    isSelected: selected === 'management',
    'data-test-subj': 'syntheticsMonitorManagementTab',
  },
  {
    id: 'errors',
    label: i18n.translate('xpack.synthetics.monitorManagement.errorsTab.title', {
      defaultMessage: 'Errors',
    }),
    href: `${syntheticsPath}${ERRORS_ROUTE}${search}`,
    isSelected: selected === 'errors',
    'data-test-subj': 'syntheticsMonitorErrorsTab',
  },
];
