/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiBasicTable, EuiHealth, EuiBadge, EuiToolTip, EuiText } from '@elastic/eui';
import type { EuiBasicTableColumn, Pagination } from '@elastic/eui';
import type { DriftEvent } from '../../../common/endpoint_assets';
import * as i18n from '../pages/translations';

interface RecentChangeRow {
  timestamp: string;
  host_name: string;
  platform: string;
  category: string;
  action: string;
  item_name: string;
  item_value: string;
  query_name: string;
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

const getPlatformIcon = (platform: string): string => {
  switch (platform?.toLowerCase()) {
    case 'darwin':
    case 'macos':
      return '🍎';
    case 'windows':
      return '🪟';
    case 'linux':
      return '🐧';
    default:
      return '💻';
  }
};

const getActionColor = (action: string): string => {
  switch (action) {
    case 'added':
      return 'success';
    case 'removed':
      return 'danger';
    case 'changed':
      return 'warning';
    default:
      return 'default';
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
    platform: event.host.os?.platform ?? 'unknown',
    category: event.drift.category,
    action: event.drift.action,
    item_name: event.drift.item.name,
    item_value: event.drift.item.value ?? '',
    query_name: event.drift.query_name ?? event.drift.item.type ?? 'change',
    severity: event.drift.severity,
  }));

  const columns: Array<EuiBasicTableColumn<RecentChangeRow>> = [
    {
      field: 'timestamp',
      name: i18n.DRIFT_COLUMN_TIME,
      width: '120px',
      render: (timestamp: string) => new Date(timestamp).toLocaleTimeString(),
    },
    {
      field: 'host_name',
      name: i18n.DRIFT_COLUMN_HOST,
      width: '200px',
      render: (hostName: string, item: RecentChangeRow) => (
        <EuiToolTip content={item.platform}>
          <span>
            {getPlatformIcon(item.platform)} {hostName}
          </span>
        </EuiToolTip>
      ),
    },
    {
      field: 'category',
      name: i18n.DRIFT_COLUMN_CATEGORY,
      width: '100px',
      render: (category: string) => getCategoryLabel(category),
    },
    {
      field: 'query_name',
      name: 'Type',
      width: '140px',
      render: (queryName: string) => (
        <EuiText size="xs" color="subdued">
          {queryName}
        </EuiText>
      ),
    },
    {
      field: 'item_name',
      name: i18n.DRIFT_COLUMN_CHANGE,
      render: (itemName: string, item: RecentChangeRow) => (
        <div>
          <EuiBadge color={getActionColor(item.action)}>{item.action}</EuiBadge>{' '}
          <strong>{itemName}</strong>
          {item.item_value && (
            <EuiText size="xs" color="subdued" style={{ display: 'inline', marginLeft: 4 }}>
              ({item.item_value})
            </EuiText>
          )}
        </div>
      ),
    },
    {
      field: 'severity',
      name: i18n.DRIFT_COLUMN_SEVERITY,
      width: '90px',
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
          // Only call handlers if values actually changed to avoid
          // handlePageSizeChange resetting page to 0 on every click
          if (page.index !== undefined && page.index !== pagination.pageIndex) {
            onPageChange(page.index);
          }
          if (page.size !== undefined && page.size !== pagination.pageSize) {
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
