/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback } from 'react';
import { EuiLink, EuiText, EuiToolTip } from '@elastic/eui';
import type { DashboardMigrationDashboard } from '../../../../../common/siem_migrations/model/dashboard_migration.gen';
import { SiemMigrationStatus } from '../../../../../common/siem_migrations/constants';
import * as i18n from './translations';
import type { TableColumn } from './constants';

interface NameProps {
  dashboard: DashboardMigrationDashboard;
  openDashboardDetailsFlyout: (dashboard: DashboardMigrationDashboard) => void;
}

const Name = ({ dashboard, openDashboardDetailsFlyout }: NameProps) => {
  const title = dashboard.elastic_dashboard?.title ?? dashboard.original_dashboard.title;

  const onClick = useCallback(() => {
    openDashboardDetailsFlyout(dashboard);
  }, [dashboard, openDashboardDetailsFlyout]);

  if (dashboard.status === SiemMigrationStatus.FAILED) {
    return (
      <EuiText data-test-subj="dashboardNameFailed" color="danger" size="s">
        {title}
      </EuiText>
    );
  }

  return (
    <EuiToolTip content={i18n.VIEW_DASHBOARD_TRANSLATION_SUMMARY_TOOLTIP}>
      <EuiLink onClick={onClick} data-test-subj="viewDashboardTranslationSummary">
        {title}
      </EuiLink>
    </EuiToolTip>
  );
};

export type CreateNameColumnParams = Pick<NameProps, 'openDashboardDetailsFlyout'>;

export const createNameColumn = ({
  openDashboardDetailsFlyout,
}: CreateNameColumnParams): TableColumn => {
  return {
    field: 'original_dashboard.title',
    name: i18n.COLUMN_NAME,
    render: (_, dashboard: DashboardMigrationDashboard) => (
      <Name dashboard={dashboard} openDashboardDetailsFlyout={openDashboardDetailsFlyout} />
    ),
    sortable: true,
    truncateText: true,
    width: '50%',
    align: 'left',
  };
};
