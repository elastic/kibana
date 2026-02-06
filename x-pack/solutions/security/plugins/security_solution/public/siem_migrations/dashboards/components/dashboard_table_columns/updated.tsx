/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { DashboardMigrationDashboard } from '../../../../../common/siem_migrations/model/dashboard_migration.gen';
import { FormattedRelativePreferenceDate } from '../../../../common/components/formatted_date';
import * as i18n from './translations';
import type { TableColumn } from './constants';
import { TableHeader } from '../../../common/components';

export const SIEM_DASHBOARDS_MIGRATIONS_UPDATED_HEADER_ID = 'siemDashboardsMigrationsUpdatedHeader';

export const createUpdatedColumn = (): TableColumn => {
  return {
    field: 'original_dashboard.last_updated',
    name: (
      <TableHeader
        id={SIEM_DASHBOARDS_MIGRATIONS_UPDATED_HEADER_ID}
        title={i18n.COLUMN_UPDATED}
        tooltipContent={i18n.UPDATE_COLUMN_TOOLTIP}
      />
    ),
    render: (value: DashboardMigrationDashboard['original_dashboard']['last_updated']) => (
      <FormattedRelativePreferenceDate value={value} dateFormat="M/D/YY" />
    ),
    sortable: true,
    truncateText: true,
    align: 'left',
    width: '15%',
  };
};
