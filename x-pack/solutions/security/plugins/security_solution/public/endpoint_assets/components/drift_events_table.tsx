/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiBasicTable, EuiHealth } from '@elastic/eui';
import type { EuiBasicTableColumn, Pagination } from '@elastic/eui';
import type { DriftEvent } from '../../../common/endpoint_assets';
import * as i18n from '../pages/translations';

interface RecentChangeRow {
  timestamp: string;
  host_name: string;
  category: string;
  change: string;
  severity: string;
}

export interface DriftEventsTableProps {
  events: DriftEvent[];
  loading: boolean;
  pagination: Pagination;
  onPageChange: (pageIndex: number) => void;
  onPageSizeChange: (pageSize: number) => void;
}

const getSeverityColor = (severity: string): string => {
  switch (severity) {
    case 'critical':
      return 'danger';
    case 'high':
      return 'danger';
    case 'medium':
      return 'warning';
    default:
      return 'success';
  }
};

const getCategoryLabel = (category: string): string => {
  switch (category) {
    case 'persistence':
      return i18n.DRIFT_CATEGORY_PERSISTENCE;
    case 'privileges':
      return i18n.DRIFT_CATEGORY_PRIVILEGES;
    case 'network':
      return i18n.DRIFT_CATEGORY_NETWORK;
    case 'software':
      return i18n.DRIFT_CATEGORY_SOFTWARE;
    case 'posture':
      return i18n.DRIFT_CATEGORY_POSTURE;
    default:
      return category;
  }
};

const DriftEventsTableComponent: React.FC<DriftEventsTableProps> = ({
  events,
  loading,
  pagination,
  onPageChange,
  onPageSizeChange,
}) => {
  const recentChanges: RecentChangeRow[] = events.map((event) => ({
    timestamp: event['@timestamp'],
    host_name: event.host.name,
    category: event.drift.category,
    change: `${event.drift.action}: ${event.drift.item.name}`,
    severity: event.drift.severity,
  }));

  const columns: Array<EuiBasicTableColumn<RecentChangeRow>> = [
    {
      field: 'timestamp',
      name: i18n.DRIFT_COLUMN_TIME,
      width: '150px',
      render: (timestamp: string) => new Date(timestamp).toLocaleTimeString(),
    },
    {
      field: 'host_name',
      name: i18n.DRIFT_COLUMN_HOST,
    },
    {
      field: 'category',
      name: i18n.DRIFT_COLUMN_CATEGORY,
      render: (category: string) => getCategoryLabel(category),
    },
    {
      field: 'change',
      name: i18n.DRIFT_COLUMN_CHANGE,
    },
    {
      field: 'severity',
      name: i18n.DRIFT_COLUMN_SEVERITY,
      width: '100px',
      render: (severity: string) => (
        <EuiHealth color={getSeverityColor(severity)}>{severity.toUpperCase()}</EuiHealth>
      ),
    },
  ];

  return (
    <EuiBasicTable<RecentChangeRow>
      data-test-subj="drift-events-table"
      items={recentChanges}
      columns={columns}
      loading={loading}
      pagination={{
        pageIndex: pagination.pageIndex,
        pageSize: pagination.pageSize,
        totalItemCount: pagination.totalItemCount,
        pageSizeOptions: [10, 25, 50, 100],
      }}
      onChange={({ page }) => {
        if (page) {
          if (page.index !== undefined) {
            onPageChange(page.index);
          }
          if (page.size !== undefined) {
            onPageSizeChange(page.size);
          }
        }
      }}
      compressed
    />
  );
};

export const DriftEventsTable = React.memo(DriftEventsTableComponent);
DriftEventsTable.displayName = 'DriftEventsTable';
