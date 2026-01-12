/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo, useCallback, useState } from 'react';
import type { EuiBasicTableColumn, CriteriaWithPagination } from '@elastic/eui';
import {
  EuiBasicTable,
  EuiBadge,
  EuiLink,
  EuiLoadingSpinner,
  EuiEmptyPrompt,
  EuiIcon,
} from '@elastic/eui';
import type { EndpointAssetRecord } from '../hooks/use_endpoint_assets';
import { TEST_SUBJECTS, DEFAULT_VISIBLE_ROWS_PER_PAGE } from '../../../common/endpoint_assets';
import * as i18n from '../pages/translations';

export interface EndpointAssetsTableProps {
  assets: EndpointAssetRecord[];
  loading?: boolean;
}

const getPlatformIcon = (platform: string): React.ReactNode => {
  switch (platform?.toLowerCase()) {
    case 'windows':
      return <EuiIcon type="logoWindows" size="m" />;
    case 'darwin':
    case 'macos':
      return <EuiIcon type="logoApple" size="m" />;
    case 'linux':
    case 'ubuntu':
    case 'rhel':
    case 'centos':
    case 'debian':
      return <EuiIcon type="logoLinux" size="m" />;
    default:
      return <EuiIcon type="compute" size="m" />;
  }
};

const getPlatformLabel = (platform: string): string => {
  switch (platform?.toLowerCase()) {
    case 'darwin':
      return 'macOS';
    case 'rhel':
      return 'RHEL';
    default:
      return platform?.charAt(0).toUpperCase() + platform?.slice(1) || 'Unknown';
  }
};

const formatLastSeen = (date: string): string => {
  if (!date) return '-';
  const d = new Date(date);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffMins = Math.floor(diffMs / 60000);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins} min ago`;
  if (diffMins < 1440) return `${Math.floor(diffMins / 60)} hours ago`;
  if (diffMins < 10080) return `${Math.floor(diffMins / 1440)} days ago`;
  return d.toLocaleDateString();
};

export const EndpointAssetsTable: React.FC<EndpointAssetsTableProps> = React.memo(
  ({ assets, loading }) => {
    const [pageIndex, setPageIndex] = useState(0);
    const [pageSize, setPageSize] = useState(DEFAULT_VISIBLE_ROWS_PER_PAGE);
    const [sortField, setSortField] = useState<keyof EndpointAssetRecord>('lastSeen');
    const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');

    const columns: Array<EuiBasicTableColumn<EndpointAssetRecord>> = useMemo(
      () => [
        {
          field: 'name',
          name: i18n.COLUMN_NAME,
          sortable: true,
          render: (name: string, asset: EndpointAssetRecord) => (
            <EuiLink>{name || asset.id}</EuiLink>
          ),
        },
        {
          field: 'platform',
          name: i18n.COLUMN_PLATFORM,
          sortable: true,
          width: '140px',
          render: (platform: string) => (
            <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              {getPlatformIcon(platform)} {getPlatformLabel(platform)}
            </span>
          ),
        },
        {
          field: 'osName',
          name: 'OS',
          sortable: true,
          width: '180px',
          render: (osName: string, asset: EndpointAssetRecord) =>
            `${osName || 'Unknown'}${asset.osVersion ? ` ${asset.osVersion}` : ''}`,
        },
        {
          field: 'hostname',
          name: 'Hostname',
          sortable: true,
          width: '200px',
          render: (hostname: string) => hostname || '-',
        },
        {
          field: 'agentName',
          name: 'Agent',
          sortable: true,
          width: '180px',
          render: (agentName: string) => agentName || '-',
        },
        {
          field: 'source',
          name: 'Source',
          sortable: true,
          width: '120px',
          render: (source: string) => (
            <EuiBadge color="hollow">
              {source?.includes('osquery') ? 'Osquery' : source || 'Unknown'}
            </EuiBadge>
          ),
        },
        {
          field: 'lastSeen',
          name: i18n.COLUMN_LAST_SEEN,
          sortable: true,
          width: '140px',
          render: (date: string) => formatLastSeen(date),
        },
      ],
      []
    );

    const onTableChange = useCallback(
      ({ page, sort }: CriteriaWithPagination<EndpointAssetRecord>) => {
        if (page) {
          setPageIndex(page.index);
          setPageSize(page.size);
        }
        if (sort) {
          setSortField(sort.field as keyof EndpointAssetRecord);
          setSortDirection(sort.direction);
        }
      },
      []
    );

    const pagination = useMemo(
      () => ({
        pageIndex,
        pageSize,
        totalItemCount: assets.length,
        pageSizeOptions: [10, 25, 50, 100],
      }),
      [pageIndex, pageSize, assets.length]
    );

    const sorting = useMemo(
      () => ({
        sort: {
          field: sortField,
          direction: sortDirection,
        },
      }),
      [sortField, sortDirection]
    );

    // Client-side pagination and sorting
    const displayedAssets = useMemo(() => {
      const sorted = [...assets].sort((a, b) => {
        const aVal = a[sortField];
        const bVal = b[sortField];

        if (aVal === bVal) return 0;
        if (aVal === undefined || aVal === null || aVal === '') return 1;
        if (bVal === undefined || bVal === null || bVal === '') return -1;

        const comparison = aVal < bVal ? -1 : 1;
        return sortDirection === 'asc' ? comparison : -comparison;
      });

      return sorted.slice(pageIndex * pageSize, (pageIndex + 1) * pageSize);
    }, [assets, sortField, sortDirection, pageIndex, pageSize]);

    if (loading) {
      return (
        <div style={{ textAlign: 'center', padding: 40 }}>
          <EuiLoadingSpinner size="xl" />
        </div>
      );
    }

    if (assets.length === 0) {
      return (
        <EuiEmptyPrompt
          iconType="compute"
          title={<h2>{i18n.NO_ASSETS_FOUND}</h2>}
          body={
            <p>
              Endpoint assets will appear here once osquery data is collected and processed by the
              Entity Store.
            </p>
          }
        />
      );
    }

    return (
      <EuiBasicTable
        items={displayedAssets}
        columns={columns}
        pagination={pagination}
        sorting={sorting}
        onChange={onTableChange}
        data-test-subj={TEST_SUBJECTS.DATA_GRID}
        rowHeader="name"
      />
    );
  }
);

EndpointAssetsTable.displayName = 'EndpointAssetsTable';
