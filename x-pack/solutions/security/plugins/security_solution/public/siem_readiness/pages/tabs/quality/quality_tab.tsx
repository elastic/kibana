/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo, useState, useCallback } from 'react';
import {
  EuiText,
  EuiSpacer,
  EuiAccordion,
  EuiInMemoryTable,
  EuiLoadingSpinner,
  EuiCallOut,
  EuiBadge,
  EuiFlexGroup,
  EuiFlexItem,
  EuiHorizontalRule,
  EuiFieldSearch,
  EuiFilterGroup,
  EuiFilterButton,
} from '@elastic/eui';
import type { EuiBasicTableColumn } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import moment from 'moment';
import { useSiemReadinessApi } from '@kbn/siem-readiness';
import type { IndexInfo, CategoryGroup, ResultDocument } from '@kbn/siem-readiness';
import { mockQualityResponse } from '../../../../../server/lib/siem_readiness/routes/mock_quality_results';

const STATUS_BADGE_CONFIG = {
  'Actions required': { color: 'warning', label: 'Actions required' },
  Healthy: { color: 'success', label: 'Healthy' },
} as const;

type StatusFilter = 'all' | 'incompatible' | 'healthy';

export const QualityTab: React.FC = () => {
  const { getReadinessCategories, getIndexResultsLatest } = useSiemReadinessApi();
  const { data, isLoading, error } = getReadinessCategories;
  // const { data: indexResultsData } = getIndexResultsLatest;

  const indexResultsData = mockQualityResponse;

  // Track which accordions are open
  const [openAccordions, setOpenAccordions] = useState<Record<string, boolean>>({});

  // Search and filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');

  // Create a lookup map for index results by indexName
  const indexResultsMap = useMemo(() => {
    if (!indexResultsData) return new Map<string, ResultDocument>();

    return new Map(indexResultsData.map((result) => [result.indexName, result]));
  }, [indexResultsData]);

  const toggleAccordion = (categoryName: string) => {
    setOpenAccordions((prev) => ({
      ...prev,
      [categoryName]: !prev[categoryName],
    }));
  };

  // Filter indices based on search query and status filter
  const filterIndices = useCallback(
    (indices: IndexInfo[]): IndexInfo[] => {
      return indices.filter((index) => {
        // Search filter
        const matchesSearch = searchQuery
          ? index.indexName.toLowerCase().includes(searchQuery.toLowerCase())
          : true;

        // Status filter
        const result = indexResultsMap.get(index.indexName);
        const incompatibleCount = result?.incompatibleFieldCount ?? 0;
        const isIncompatible = incompatibleCount > 0;

        const matchesStatus =
          statusFilter === 'all' ||
          (statusFilter === 'incompatible' && isIncompatible) ||
          (statusFilter === 'healthy' && !isIncompatible);

        return matchesSearch && matchesStatus;
      });
    },
    [searchQuery, statusFilter, indexResultsMap]
  );

  // Filter categories to only show those with matching indices
  const filteredCategories = useMemo(() => {
    if (!data?.mainCategoriesMap) return [];

    return data.mainCategoriesMap
      .map((category) => ({
        ...category,
        indices: filterIndices(category.indices),
      }))
      .filter((category) => category.indices.length > 0);
  }, [data?.mainCategoriesMap, filterIndices]);

  // Calculate total counts for display
  const totalIndicesCount = filteredCategories.reduce((sum, cat) => sum + cat.indices.length, 0);
  const totalGroupsCount = filteredCategories.length;

  // Define columns for the data source table
  const columns: Array<EuiBasicTableColumn<IndexInfo>> = useMemo(
    () => [
      {
        field: 'indexName',
        name: i18n.translate(
          'xpack.securitySolution.siemReadiness.quality.table.column.dataSource',
          {
            defaultMessage: 'Data source',
          }
        ),
        sortable: true,
        truncateText: true,
        width: '40%',
      },
      {
        name: i18n.translate(
          'xpack.securitySolution.siemReadiness.quality.table.column.incompatibleFields',
          {
            defaultMessage: 'Incompatible fields',
          }
        ),
        sortable: true,
        width: '15%',
        align: 'right',
        render: (item: IndexInfo) => {
          const result = indexResultsMap.get(item.indexName);
          const count = result?.incompatibleFieldCount ?? 0;
          return <strong>{count}</strong>;
        },
      },
      {
        name: i18n.translate(
          'xpack.securitySolution.siemReadiness.quality.table.column.lastChecked',
          {
            defaultMessage: 'Last checked',
          }
        ),
        width: '15%',
        render: (item: IndexInfo) => {
          const result = indexResultsMap.get(item.indexName);
          if (!result?.checkedAt) {
            return i18n.translate(
              'xpack.securitySolution.siemReadiness.quality.lastChecked.never',
              {
                defaultMessage: 'Never',
              }
            );
          }
          return moment(result.checkedAt).fromNow();
        },
      },
      {
        name: i18n.translate('xpack.securitySolution.siemReadiness.quality.table.column.status', {
          defaultMessage: 'Status',
        }),
        width: '15%',
        render: (item: IndexInfo) => {
          const result = indexResultsMap.get(item.indexName);
          const incompatibleCount = result?.incompatibleFieldCount ?? 0;
          const isIncompatible = incompatibleCount > 0;
          return (
            <EuiBadge color={isIncompatible ? 'warning' : 'success'}>
              {isIncompatible
                ? i18n.translate(
                    'xpack.securitySolution.siemReadiness.quality.status.incompatible',
                    {
                      defaultMessage: 'Incompatible',
                    }
                  )
                : i18n.translate('xpack.securitySolution.siemReadiness.quality.status.healthy', {
                    defaultMessage: 'Healthy',
                  })}
            </EuiBadge>
          );
        },
      },
      {
        name: i18n.translate('xpack.securitySolution.siemReadiness.quality.table.column.action', {
          defaultMessage: 'Actions',
        }),
        width: '15%',
        actions: [
          {
            name: i18n.translate('xpack.securitySolution.siemReadiness.quality.action.view', {
              defaultMessage: 'View Data quality',
            }),
            description: i18n.translate(
              'xpack.securitySolution.siemReadiness.quality.action.view.description',
              {
                defaultMessage: 'View data quality details',
              }
            ),
            type: 'icon',
            icon: 'eye',
            onClick: () => {
              // Placeholder - will be implemented later
            },
          },
        ],
      },
    ],
    [indexResultsMap]
  );

  // Calculate stats for each category
  const getCategoryStats = (category: CategoryGroup) => {
    const totalDataSources = category.indices.length;

    // Calculate incompatible fields count from indexResultsData
    const incompatibleFields = category.indices.reduce((sum, index) => {
      const result = indexResultsMap.get(index.indexName);
      return sum + (result?.incompatibleFieldCount ?? 0);
    }, 0);

    const affectedIntegrations = new Set(
      category.indices.map((index) => index.indexName.split('-')[0])
    ).size;

    const hasIncompatibleFields = incompatibleFields > 0;
    const status: keyof typeof STATUS_BADGE_CONFIG = hasIncompatibleFields
      ? 'Actions required'
      : 'Healthy';

    return {
      totalDataSources,
      incompatibleFields,
      affectedIntegrations,
      status,
    };
  };

  if (isLoading) {
    return (
      <>
        <EuiSpacer size="m" />
        <EuiFlexGroup justifyContent="center" alignItems="center">
          <EuiFlexItem grow={false}>
            <EuiLoadingSpinner size="xl" />
          </EuiFlexItem>
        </EuiFlexGroup>
      </>
    );
  }

  if (error) {
    return (
      <>
        <EuiSpacer size="m" />
        <EuiCallOut
          title={i18n.translate('xpack.securitySolution.siemReadiness.quality.error.title', {
            defaultMessage: 'Error loading quality data',
          })}
          color="danger"
          iconType="error"
          announceOnMount
        >
          <p>{(error as Error).message}</p>
        </EuiCallOut>
      </>
    );
  }

  const mainCategories = data?.mainCategoriesMap ?? [];

  if (mainCategories.length === 0) {
    return (
      <>
        <EuiSpacer size="m" />
        <EuiCallOut
          title={i18n.translate('xpack.securitySolution.siemReadiness.quality.noData.title', {
            defaultMessage: 'No data available',
          })}
          color="primary"
          iconType="iInCircle"
          announceOnMount
        >
          <p>
            {i18n.translate('xpack.securitySolution.siemReadiness.quality.noData.description', {
              defaultMessage: 'No category data found. Please check your data sources.',
            })}
          </p>
        </EuiCallOut>
      </>
    );
  }

  return (
    <>
      <EuiSpacer size="m" />

      {/* Search and Filter Controls */}
      <EuiFlexGroup alignItems="center" justifyContent="spaceBetween" gutterSize="m">
        <EuiFlexItem grow={false}>
          <EuiFlexGroup alignItems="center" gutterSize="s" responsive={false}>
            <EuiFlexItem grow={false}>
              <EuiText size="s" color="subdued">
                {i18n.translate('xpack.securitySolution.siemReadiness.quality.showing', {
                  defaultMessage: 'Showing {indices} of {totalIndices} data sources',
                  values: {
                    indices: totalIndicesCount,
                    totalIndices: mainCategories.reduce((sum, cat) => sum + cat.indices.length, 0),
                  },
                })}
              </EuiText>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiText size="s" color="subdued">
                {'|'}
              </EuiText>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiText size="s" color="subdued">
                {i18n.translate('xpack.securitySolution.siemReadiness.quality.groups', {
                  defaultMessage: '{count} groups',
                  values: { count: totalGroupsCount },
                })}
              </EuiText>
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlexItem>

        <EuiFlexItem grow={false}>
          <EuiFlexGroup alignItems="center" gutterSize="m" responsive={false}>
            <EuiFlexItem grow={false}>
              <EuiFieldSearch
                placeholder={i18n.translate(
                  'xpack.securitySolution.siemReadiness.quality.searchPlaceholder',
                  {
                    defaultMessage: 'Search data sources...',
                  }
                )}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                isClearable
                style={{ width: '300px' }}
              />
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiFilterGroup>
                <EuiFilterButton
                  hasActiveFilters={statusFilter === 'all'}
                  onClick={() => setStatusFilter('all')}
                >
                  {i18n.translate('xpack.securitySolution.siemReadiness.quality.filter.all', {
                    defaultMessage: 'All',
                  })}
                </EuiFilterButton>
                <EuiFilterButton
                  hasActiveFilters={statusFilter === 'incompatible'}
                  onClick={() => setStatusFilter('incompatible')}
                  color="danger"
                >
                  {i18n.translate(
                    'xpack.securitySolution.siemReadiness.quality.filter.incompatible',
                    {
                      defaultMessage: 'Incompatible',
                    }
                  )}
                </EuiFilterButton>
                <EuiFilterButton
                  hasActiveFilters={statusFilter === 'healthy'}
                  onClick={() => setStatusFilter('healthy')}
                  color="success"
                >
                  {i18n.translate('xpack.securitySolution.siemReadiness.quality.filter.healthy', {
                    defaultMessage: 'Healthy',
                  })}
                </EuiFilterButton>
              </EuiFilterGroup>
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlexItem>
      </EuiFlexGroup>

      <EuiSpacer size="m" />
      <div style={{ border: '1px solid #D3DAE6', padding: '16px', borderRadius: '4px' }}>
        {filteredCategories.map((category, index) => {
          const stats = getCategoryStats(category);
          const statusConfig = STATUS_BADGE_CONFIG[stats.status];

          return (
            <React.Fragment key={category.category}>
              <EuiAccordion
                id={`accordion-${category.category}`}
                buttonContent={
                  <EuiFlexGroup alignItems="center" gutterSize="m" responsive={false}>
                    <EuiFlexItem grow={false}>
                      <EuiText size="m">
                        <strong>{category.category}</strong>
                      </EuiText>
                    </EuiFlexItem>
                  </EuiFlexGroup>
                }
                extraAction={
                  <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false}>
                    <EuiFlexItem grow={false}>
                      <EuiText size="xs" color="subdued">
                        {i18n.translate(
                          'xpack.securitySolution.siemReadiness.quality.status.label',
                          {
                            defaultMessage: 'Status:',
                          }
                        )}
                      </EuiText>
                    </EuiFlexItem>
                    <EuiFlexItem grow={false}>
                      <EuiBadge color={statusConfig.color}>{statusConfig.label}</EuiBadge>
                    </EuiFlexItem>
                    <EuiFlexItem grow={false}>
                      <EuiText size="xs" color="subdued">
                        {'|'}
                      </EuiText>
                    </EuiFlexItem>
                    <EuiFlexItem grow={false}>
                      <EuiText size="xs" color="subdued">
                        {i18n.translate(
                          'xpack.securitySolution.siemReadiness.quality.incompatibleFields.label',
                          {
                            defaultMessage: 'Incompatible Fields:',
                          }
                        )}
                      </EuiText>
                    </EuiFlexItem>
                    <EuiFlexItem grow={false}>
                      <EuiBadge color="hollow">{stats.incompatibleFields}</EuiBadge>
                    </EuiFlexItem>
                    <EuiFlexItem grow={false}>
                      <EuiText size="xs" color="subdued">
                        {'|'}
                      </EuiText>
                    </EuiFlexItem>
                    <EuiFlexItem grow={false}>
                      <EuiText size="xs" color="subdued">
                        {i18n.translate(
                          'xpack.securitySolution.siemReadiness.quality.affectedIntegrations.label',
                          {
                            defaultMessage: 'Affected integrations:',
                          }
                        )}
                      </EuiText>
                    </EuiFlexItem>
                    <EuiFlexItem grow={false}>
                      <EuiBadge color="hollow">
                        {`${stats.affectedIntegrations}/${stats.totalDataSources}`}
                      </EuiBadge>
                    </EuiFlexItem>
                  </EuiFlexGroup>
                }
                paddingSize="none"
                borders="none"
                forceState={openAccordions[category.category] ? 'open' : 'closed'}
                onToggle={() => toggleAccordion(category.category)}
                buttonProps={{ paddingSize: 'l' }}
              >
                <div style={{ border: '1px solid #D3DAE6', padding: '16px', borderRadius: '4px' }}>
                  <EuiInMemoryTable
                    items={category.indices}
                    columns={columns}
                    sorting={{
                      sort: {
                        field: 'indexName',
                        direction: 'asc',
                      },
                    }}
                    pagination={{
                      pageSizeOptions: [5, 10, 20],
                      initialPageSize: 10,
                    }}
                    tableCaption={i18n.translate(
                      'xpack.securitySolution.siemReadiness.quality.table.caption',
                      {
                        defaultMessage: 'Data sources for {category} category',
                        values: { category: category.category },
                      }
                    )}
                    tableLayout="auto"
                  />
                </div>
              </EuiAccordion>{' '}
              {index < mainCategories.length - 1 && <EuiHorizontalRule margin="m" />}
            </React.Fragment>
          );
        })}
      </div>
    </>
  );
};
