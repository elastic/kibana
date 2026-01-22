/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState, useCallback, useMemo } from 'react';
import { i18n } from '@kbn/i18n';
import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiPanel,
  EuiStat,
  EuiSpacer,
  EuiTitle,
  EuiText,
  EuiLoadingSpinner,
  EuiEmptyPrompt,
  EuiBasicTable,
  EuiFieldSearch,
  EuiBadge,
  EuiCallOut,
  EuiSwitch,
  EuiToolTip,
} from '@elastic/eui';
import type { EuiBasicTableColumn, Pagination, CriteriaWithPagination } from '@elastic/eui';
import { useQuery } from '@tanstack/react-query';
import { useKibana } from '../../common/lib/kibana';
import { API_VERSIONS } from '../../../common/entity_analytics/constants';
import { ENDPOINT_ASSETS_ROUTES } from '../../../common/endpoint_assets';
import type { SoftwareOverviewResponse, AggregatedSoftwareItem } from '../../../common/endpoint_assets';

const TITLE = i18n.translate('xpack.securitySolution.endpointAssets.softwareOverview.title', {
  defaultMessage: 'Software Overview',
});

const SUBTITLE = i18n.translate('xpack.securitySolution.endpointAssets.softwareOverview.subtitle', {
  defaultMessage: 'Aggregated software inventory across all monitored endpoints',
});

const SEARCH_PLACEHOLDER = i18n.translate(
  'xpack.securitySolution.endpointAssets.softwareOverview.searchPlaceholder',
  { defaultMessage: 'Search software by name...' }
);

const NO_DATA_TITLE = i18n.translate(
  'xpack.securitySolution.endpointAssets.softwareOverview.noDataTitle',
  { defaultMessage: 'No software data available' }
);

const NO_DATA_BODY = i18n.translate(
  'xpack.securitySolution.endpointAssets.softwareOverview.noDataBody',
  {
    defaultMessage:
      'Software inventory data is not available. Ensure osquery is configured to collect software data.',
  }
);

const ERROR_TITLE = i18n.translate(
  'xpack.securitySolution.endpointAssets.softwareOverview.errorTitle',
  { defaultMessage: 'Error loading software data' }
);

const TOTAL_SOFTWARE_LABEL = i18n.translate(
  'xpack.securitySolution.endpointAssets.softwareOverview.totalSoftware',
  { defaultMessage: 'Unique Software' }
);

const APPLICATIONS_LABEL = i18n.translate(
  'xpack.securitySolution.endpointAssets.softwareOverview.applications',
  { defaultMessage: 'Applications' }
);

const SERVICES_LABEL = i18n.translate(
  'xpack.securitySolution.endpointAssets.softwareOverview.services',
  { defaultMessage: 'Services' }
);

const PACKAGES_LABEL = i18n.translate(
  'xpack.securitySolution.endpointAssets.softwareOverview.packages',
  { defaultMessage: 'Packages' }
);

const NAME_COLUMN = i18n.translate(
  'xpack.securitySolution.endpointAssets.softwareOverview.nameColumn',
  { defaultMessage: 'Software Name' }
);

const TYPE_COLUMN = i18n.translate(
  'xpack.securitySolution.endpointAssets.softwareOverview.typeColumn',
  { defaultMessage: 'Type' }
);

const HOSTS_COLUMN = i18n.translate(
  'xpack.securitySolution.endpointAssets.softwareOverview.hostsColumn',
  { defaultMessage: 'Hosts' }
);

const VERSIONS_COLUMN = i18n.translate(
  'xpack.securitySolution.endpointAssets.softwareOverview.versionsColumn',
  { defaultMessage: 'Versions' }
);

const CURRENT_ONLY_LABEL = i18n.translate(
  'xpack.securitySolution.endpointAssets.softwareOverview.currentOnlyLabel',
  { defaultMessage: 'Current only' }
);

const CURRENT_ONLY_TOOLTIP = i18n.translate(
  'xpack.securitySolution.endpointAssets.softwareOverview.currentOnlyTooltip',
  {
    defaultMessage:
      'When enabled, shows only software confirmed as installed within the last 48 hours. When disabled, shows all software ever detected (including potentially uninstalled).',
  }
);

// Default max stale hours for "current only" view - should be slightly longer than osquery pack frequency
const DEFAULT_MAX_STALE_HOURS = 48;

const useSoftwareOverview = (search: string, maxStaleHours?: number) => {
  const { http } = useKibana().services;

  return useQuery<SoftwareOverviewResponse>({
    queryKey: ['software-overview', search, maxStaleHours],
    queryFn: async () => {
      const query: Record<string, string | number> = {};
      if (search) {
        query.search = search;
      }
      if (maxStaleHours) {
        query.max_stale_hours = maxStaleHours;
      }
      const response = await http.get<SoftwareOverviewResponse>(
        ENDPOINT_ASSETS_ROUTES.SOFTWARE_OVERVIEW,
        {
          version: API_VERSIONS.public.v1,
          query: Object.keys(query).length > 0 ? query : undefined,
        }
      );
      return response;
    },
    staleTime: 30000,
  });
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

export const SoftwareOverview: React.FC = React.memo(() => {
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [page, setPage] = useState(0);
  const [pageSize] = useState(25);
  const [sortField, setSortField] = useState<keyof AggregatedSoftwareItem>('hostCount');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [currentOnly, setCurrentOnly] = useState(true);

  // Debounce search
  React.useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchTerm);
      setPage(0);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  const maxStaleHours = currentOnly ? DEFAULT_MAX_STALE_HOURS : undefined;
  const { data, isLoading, error } = useSoftwareOverview(debouncedSearch, maxStaleHours);

  const handleCurrentOnlyToggle = useCallback(() => {
    setCurrentOnly((prev) => !prev);
    setPage(0);
  }, []);

  const handleSearchChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
  }, []);

  const sortedItems = useMemo(() => {
    if (!data?.items) return [];
    return [...data.items].sort((a, b) => {
      const aVal = a[sortField];
      const bVal = b[sortField];
      if (typeof aVal === 'number' && typeof bVal === 'number') {
        return sortDirection === 'asc' ? aVal - bVal : bVal - aVal;
      }
      return sortDirection === 'asc'
        ? String(aVal).localeCompare(String(bVal))
        : String(bVal).localeCompare(String(aVal));
    });
  }, [data?.items, sortField, sortDirection]);

  const paginatedItems = useMemo(() => {
    const start = page * pageSize;
    return sortedItems.slice(start, start + pageSize);
  }, [sortedItems, page, pageSize]);

  const columns: Array<EuiBasicTableColumn<AggregatedSoftwareItem>> = useMemo(
    () => [
      {
        field: 'name',
        name: NAME_COLUMN,
        sortable: true,
        truncateText: true,
        width: '40%',
        render: (name: string) => <strong>{name}</strong>,
      },
      {
        field: 'type',
        name: TYPE_COLUMN,
        width: '15%',
        render: (type: string) => <EuiBadge color={getTypeBadgeColor(type)}>{type}</EuiBadge>,
      },
      {
        field: 'hostCount',
        name: HOSTS_COLUMN,
        sortable: true,
        width: '15%',
        render: (count: number) => (
          <EuiBadge color="hollow">{count} host{count !== 1 ? 's' : ''}</EuiBadge>
        ),
      },
      {
        field: 'versions',
        name: VERSIONS_COLUMN,
        width: '30%',
        render: (versions: string[]) => (
          <EuiText size="xs" color="subdued">
            {versions.length > 0 ? versions.slice(0, 3).join(', ') : '-'}
            {versions.length > 3 && ` +${versions.length - 3} more`}
          </EuiText>
        ),
      },
    ],
    []
  );

  const pagination: Pagination = useMemo(
    () => ({
      pageIndex: page,
      pageSize,
      totalItemCount: sortedItems.length,
      showPerPageOptions: false,
    }),
    [page, pageSize, sortedItems.length]
  );

  const handleTableChange = useCallback(
    ({ page: newPage, sort }: CriteriaWithPagination<AggregatedSoftwareItem>) => {
      if (newPage) {
        setPage(newPage.index);
      }
      if (sort) {
        setSortField(sort.field as keyof AggregatedSoftwareItem);
        setSortDirection(sort.direction);
      }
    },
    []
  );

  if (isLoading) {
    return (
      <EuiFlexGroup justifyContent="center" alignItems="center" style={{ minHeight: 300 }}>
        <EuiFlexItem grow={false}>
          <EuiLoadingSpinner size="xl" />
        </EuiFlexItem>
      </EuiFlexGroup>
    );
  }

  if (error) {
    return (
      <EuiCallOut title={ERROR_TITLE} color="danger" iconType="error">
        <p>{(error as Error).message}</p>
      </EuiCallOut>
    );
  }

  if (!data || data.total === 0) {
    return (
      <EuiEmptyPrompt
        iconType="database"
        title={<h3>{NO_DATA_TITLE}</h3>}
        body={<p>{NO_DATA_BODY}</p>}
      />
    );
  }

  return (
    <EuiFlexGroup direction="column" gutterSize="l">
      {/* Header */}
      <EuiFlexItem grow={false}>
        <EuiTitle size="s">
          <h2>{TITLE}</h2>
        </EuiTitle>
        <EuiText size="s" color="subdued">
          {SUBTITLE}
        </EuiText>
      </EuiFlexItem>

      {/* Summary Cards */}
      <EuiFlexItem grow={false}>
        <EuiFlexGroup gutterSize="l">
          <EuiFlexItem>
            <EuiPanel hasBorder paddingSize="m">
              <EuiStat
                title={data.total}
                description={TOTAL_SOFTWARE_LABEL}
                titleSize="m"
              />
            </EuiPanel>
          </EuiFlexItem>
          <EuiFlexItem>
            <EuiPanel hasBorder paddingSize="m">
              <EuiStat
                title={data.applications}
                description={APPLICATIONS_LABEL}
                titleSize="m"
                titleColor="primary"
              />
            </EuiPanel>
          </EuiFlexItem>
          <EuiFlexItem>
            <EuiPanel hasBorder paddingSize="m">
              <EuiStat
                title={data.packages}
                description={PACKAGES_LABEL}
                titleSize="m"
                titleColor="success"
              />
            </EuiPanel>
          </EuiFlexItem>
          <EuiFlexItem>
            <EuiPanel hasBorder paddingSize="m">
              <EuiStat
                title={data.services}
                description={SERVICES_LABEL}
                titleSize="m"
                titleColor="warning"
              />
            </EuiPanel>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlexItem>

      {/* Search and Table */}
      <EuiFlexItem>
        <EuiPanel hasBorder>
          <EuiFlexGroup alignItems="center" gutterSize="m">
            <EuiFlexItem>
              <EuiFieldSearch
                placeholder={SEARCH_PLACEHOLDER}
                value={searchTerm}
                onChange={handleSearchChange}
                isClearable
                fullWidth
              />
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiToolTip content={CURRENT_ONLY_TOOLTIP} position="top">
                <EuiSwitch
                  label={CURRENT_ONLY_LABEL}
                  checked={currentOnly}
                  onChange={handleCurrentOnlyToggle}
                  compressed
                />
              </EuiToolTip>
            </EuiFlexItem>
          </EuiFlexGroup>

          <EuiSpacer size="m" />

          <EuiBasicTable<AggregatedSoftwareItem>
            items={paginatedItems}
            columns={columns}
            pagination={pagination}
            sorting={{
              sort: {
                field: sortField,
                direction: sortDirection,
              },
            }}
            onChange={handleTableChange}
            loading={isLoading}
          />
        </EuiPanel>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
});

SoftwareOverview.displayName = 'SoftwareOverview';
