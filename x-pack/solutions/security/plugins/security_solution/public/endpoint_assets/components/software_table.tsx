/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo, useCallback } from 'react';
import { i18n } from '@kbn/i18n';
import {
  EuiBasicTable,
  EuiFieldSearch,
  EuiFlexGroup,
  EuiFlexItem,
  EuiPanel,
  EuiEmptyPrompt,
  EuiTitle,
  EuiSpacer,
  EuiText,
  EuiCallOut,
  EuiBadge,
} from '@elastic/eui';
import type { EuiBasicTableColumn, Pagination, CriteriaWithPagination } from '@elastic/eui';
import type { SoftwareItem, SoftwareType } from '../../../common/endpoint_assets';
import { SoftwareExportButton } from './software_export_button';

interface SoftwareTableProps {
  items: SoftwareItem[];
  loading: boolean;
  error: Error | null;
  searchTerm: string;
  onSearchChange: (term: string) => void;
  page: number;
  onPageChange: (page: number) => void;
  total: number;
  sortField: 'name' | 'version' | 'lastSeen';
  sortDirection: 'asc' | 'desc';
  onSortChange: (field: 'name' | 'version' | 'lastSeen', direction: 'asc' | 'desc') => void;
  hostName: string;
  onRefresh: () => void;
  typeFilter?: SoftwareType | 'all';
  onTypeFilterChange?: (type: SoftwareType | 'all') => void;
}

const SOFTWARE_TABLE_TITLE = i18n.translate(
  'xpack.securitySolution.endpointAssets.softwareTable.title',
  {
    defaultMessage: 'Software Inventory',
  }
);

const SEARCH_PLACEHOLDER = i18n.translate(
  'xpack.securitySolution.endpointAssets.softwareTable.searchPlaceholder',
  {
    defaultMessage: 'Search software by name...',
  }
);

const NAME_COLUMN = i18n.translate(
  'xpack.securitySolution.endpointAssets.softwareTable.nameColumn',
  {
    defaultMessage: 'Name',
  }
);

const VERSION_COLUMN = i18n.translate(
  'xpack.securitySolution.endpointAssets.softwareTable.versionColumn',
  {
    defaultMessage: 'Version',
  }
);

const PATH_COLUMN = i18n.translate(
  'xpack.securitySolution.endpointAssets.softwareTable.pathColumn',
  {
    defaultMessage: 'Path',
  }
);

const TYPE_COLUMN = i18n.translate(
  'xpack.securitySolution.endpointAssets.softwareTable.typeColumn',
  {
    defaultMessage: 'Type',
  }
);

const LAST_SEEN_COLUMN = i18n.translate(
  'xpack.securitySolution.endpointAssets.softwareTable.lastSeenColumn',
  {
    defaultMessage: 'Last Seen',
  }
);

const PUBLISHER_COLUMN = i18n.translate(
  'xpack.securitySolution.endpointAssets.softwareTable.publisherColumn',
  {
    defaultMessage: 'Publisher',
  }
);

const STATUS_COLUMN = i18n.translate(
  'xpack.securitySolution.endpointAssets.softwareTable.statusColumn',
  {
    defaultMessage: 'Status',
  }
);

const ARCH_COLUMN = i18n.translate(
  'xpack.securitySolution.endpointAssets.softwareTable.archColumn',
  {
    defaultMessage: 'Arch',
  }
);

const NO_SOFTWARE_TITLE = i18n.translate(
  'xpack.securitySolution.endpointAssets.softwareTable.noSoftwareTitle',
  {
    defaultMessage: 'No software found',
  }
);

const NO_SOFTWARE_BODY = i18n.translate(
  'xpack.securitySolution.endpointAssets.softwareTable.noSoftwareBody',
  {
    defaultMessage: 'No software inventory data is available for this host.',
  }
);

const ERROR_TITLE = i18n.translate(
  'xpack.securitySolution.endpointAssets.softwareTable.errorTitle',
  {
    defaultMessage: 'Error loading software inventory',
  }
);

const formatDate = (dateString: string): string => {
  try {
    const date = new Date(dateString);
    return date.toLocaleString();
  } catch {
    return dateString;
  }
};

const getTypeBadgeColor = (type: string): string => {
  switch (type) {
    case 'application':
      return 'primary';
    case 'package':
      return 'success';
    case 'service':
      return 'warning';
    default:
      return 'default';
  }
};

const getStatusBadgeColor = (status?: string): string => {
  if (!status) return 'default';
  const s = status.toLowerCase();
  // Running states
  if (s === 'running' || s === 'active') return 'success';
  // Stopped/inactive states
  if (s === 'stopped' || s === 'inactive' || s === 'dead' || s === 'exited') return 'default';
  // Failed/error states
  if (s === 'failed' || s === 'error') return 'danger';
  // Loading/starting states
  if (s === 'loading' || s === 'starting' || s === 'activating') return 'warning';
  return 'default';
};

export const SoftwareTable: React.FC<SoftwareTableProps> = React.memo(
  ({
    items,
    loading,
    error,
    searchTerm,
    onSearchChange,
    page,
    onPageChange,
    total,
    sortField,
    sortDirection,
    onSortChange,
    hostName,
    onRefresh,
    typeFilter = 'all',
  }) => {
    const columns = useMemo((): Array<EuiBasicTableColumn<SoftwareItem>> => {
      const baseColumns: Array<EuiBasicTableColumn<SoftwareItem>> = [
        {
          field: 'name',
          name: NAME_COLUMN,
          sortable: true,
          truncateText: true,
          width: '25%',
          render: (name: string) => <strong>{name}</strong>,
        },
        {
          field: 'version',
          name: VERSION_COLUMN,
          sortable: true,
          width: '12%',
        },
      ];

      // Show type column only when viewing "all"
      if (typeFilter === 'all') {
        baseColumns.push({
          field: 'type',
          name: TYPE_COLUMN,
          width: '10%',
          render: (type: string) => (
            <EuiBadge color={getTypeBadgeColor(type)}>{type}</EuiBadge>
          ),
        });
      }

      // Show status for services
      if (typeFilter === 'service' || typeFilter === 'all') {
        baseColumns.push({
          field: 'status',
          name: STATUS_COLUMN,
          width: '10%',
          render: (status?: string) =>
            status ? (
              <EuiBadge color={getStatusBadgeColor(status)}>{status}</EuiBadge>
            ) : (
              <EuiText size="xs" color="subdued">-</EuiText>
            ),
        });
      }

      // Show publisher for apps/packages
      if (typeFilter === 'application' || typeFilter === 'package') {
        baseColumns.push({
          field: 'publisher',
          name: PUBLISHER_COLUMN,
          truncateText: true,
          width: '15%',
          render: (publisher?: string) => (
            <EuiText size="xs" color="subdued">
              {publisher || '-'}
            </EuiText>
          ),
        });
      }

      // Show arch for packages
      if (typeFilter === 'package') {
        baseColumns.push({
          field: 'arch',
          name: ARCH_COLUMN,
          width: '8%',
          render: (arch?: string) => (
            <EuiText size="xs">{arch || '-'}</EuiText>
          ),
        });
      }

      // Path column
      baseColumns.push({
        field: 'path',
        name: PATH_COLUMN,
        sortable: false,
        truncateText: true,
        width: typeFilter === 'all' ? '20%' : '25%',
        render: (path?: string) => (
          <EuiText size="xs" color="subdued">
            {path || '-'}
          </EuiText>
        ),
      });

      // Last seen column
      baseColumns.push({
        field: 'lastSeen',
        name: LAST_SEEN_COLUMN,
        sortable: true,
        render: (lastSeen: string) => formatDate(lastSeen),
        width: '13%',
      });

      return baseColumns;
    }, [typeFilter]);

    const pagination: Pagination = useMemo(
      () => ({
        pageIndex: page,
        pageSize: 25,
        totalItemCount: total,
        showPerPageOptions: false,
      }),
      [page, total]
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

    const handleTableChange = useCallback(
      ({ page: newPage, sort }: CriteriaWithPagination<SoftwareItem>) => {
        if (newPage && newPage.index !== page) {
          onPageChange(newPage.index);
        }

        if (sort && (sort.field !== sortField || sort.direction !== sortDirection)) {
          onSortChange(sort.field as 'name' | 'version' | 'lastSeen', sort.direction);
        }
      },
      [page, onPageChange, sortField, sortDirection, onSortChange]
    );

    const handleSearchChange = useCallback(
      (e: React.ChangeEvent<HTMLInputElement>) => {
        onSearchChange(e.target.value);
      },
      [onSearchChange]
    );

    if (error) {
      return (
        <EuiPanel hasBorder>
          <EuiCallOut title={ERROR_TITLE} color="danger" iconType="error">
            <p>{error.message}</p>
          </EuiCallOut>
        </EuiPanel>
      );
    }

    if (!loading && items.length === 0 && !searchTerm) {
      return (
        <EuiPanel hasBorder>
          <EuiEmptyPrompt
            iconType="database"
            title={<h3>{NO_SOFTWARE_TITLE}</h3>}
            body={<p>{NO_SOFTWARE_BODY}</p>}
          />
        </EuiPanel>
      );
    }

    return (
      <EuiPanel hasBorder>
        <EuiFlexGroup justifyContent="spaceBetween" alignItems="center">
          <EuiFlexItem grow={false}>
            <EuiTitle size="xs">
              <h3>{SOFTWARE_TABLE_TITLE}</h3>
            </EuiTitle>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <SoftwareExportButton items={items} hostName={hostName} disabled={loading} />
          </EuiFlexItem>
        </EuiFlexGroup>

        <EuiSpacer size="m" />

        <EuiFieldSearch
          placeholder={SEARCH_PLACEHOLDER}
          value={searchTerm}
          onChange={handleSearchChange}
          isClearable
          fullWidth
        />

        <EuiSpacer size="m" />

        <EuiBasicTable<SoftwareItem>
          items={items}
          columns={columns}
          loading={loading}
          pagination={pagination}
          sorting={sorting}
          onChange={handleTableChange}
          compressed
        />
      </EuiPanel>
    );
  }
);

SoftwareTable.displayName = 'SoftwareTable';
