/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiBadge, EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import type { DashboardMigrationDashboard } from '../../../../../common/siem_migrations/model/dashboard_migration.gen';
import * as i18n from './translations';
import type { TableColumn } from './constants';
import { TableHeader } from '../../../common/components';

export const SIEM_DASHBOARDS_MIGRATIONS_TAGS_HEADER_ID = 'siemDashboardsMigrationsTagsHeader';

export const createTagsColumn = (): TableColumn => {
  return {
    field: 'original_dashboard.splunk_properties',
    name: (
      <TableHeader
        id={SIEM_DASHBOARDS_MIGRATIONS_TAGS_HEADER_ID}
        title={i18n.COLUMN_TAGS}
        tooltipContent={i18n.TAGS_COLUMN_TOOLTIP}
      />
    ),
    render: (value: DashboardMigrationDashboard['original_dashboard']['splunk_properties']) => {
      return value?.app ? (
        <EuiFlexGroup wrap responsive={false} gutterSize="xs" data-test-subj="dashboardTags">
          {[value.app].map((tagItem: string) => (
            <EuiFlexItem grow={false} key={tagItem}>
              <EuiBadge data-test-subj="dashboardTagsBadge" color="default">
                {tagItem}
              </EuiBadge>
            </EuiFlexItem>
          ))}
        </EuiFlexGroup>
      ) : null;
    },
    sortable: false,
    truncateText: true,
    align: 'left',
    width: '20%',
  };
};
