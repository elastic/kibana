/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiText } from '@elastic/eui';
import { SecurityPageName } from '../../../../../common';
import { SecuritySolutionLinkAnchor } from '../../../../common/components/links';
import type { DashboardMigrationDashboard } from '../../../../../common/siem_migrations/model/dashboard_migration.gen';
import { SiemMigrationStatus } from '../../../../../common/siem_migrations/constants';
import * as i18n from './translations';
import type { TableColumn } from './constants';

interface NameProps {
  dashboard: DashboardMigrationDashboard;
}

const Name = ({ dashboard }: NameProps) => {
  const title = dashboard.original_dashboard.title;
  if (dashboard.status === SiemMigrationStatus.FAILED) {
    return (
      <EuiText data-test-subj="dashboardNameFailed" color="danger" size="s">
        {title}
      </EuiText>
    );
  }
  const dashboardId = dashboard.elastic_dashboard?.id;
  if (!dashboardId) {
    return (
      <EuiText data-test-subj="dashboardNameNotInstalled" size="s">
        {title}
      </EuiText>
    );
  }

  return (
    <SecuritySolutionLinkAnchor
      deepLinkId={SecurityPageName.dashboards}
      path={dashboardId}
      data-test-subj="viewDashboard"
    >
      {title}
    </SecuritySolutionLinkAnchor>
  );
};

export const createNameColumn = (): TableColumn => {
  return {
    field: 'original_dashboard.title',
    name: i18n.COLUMN_NAME,
    render: (_, dashboard: DashboardMigrationDashboard) => <Name dashboard={dashboard} />,
    sortable: true,
    truncateText: true,
    width: '50%',
    align: 'left',
  };
};
