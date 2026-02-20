/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo, useCallback } from 'react';
import {
  EuiSpacer,
  EuiLoadingSpinner,
  EuiCallOut,
  EuiBadge,
  EuiFlexGroup,
  EuiFlexItem,
  EuiText,
  EuiButtonEmpty,
} from '@elastic/eui';
import type { EuiBasicTableColumn } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import moment from 'moment';
import { useSiemReadinessApi } from '@kbn/siem-readiness';
import type { IndexInfo, DataQualityResultDocument, MainCategories } from '@kbn/siem-readiness';
import {
  CategoryAccordionTable,
  type CategoryData,
  type FilterOption,
} from '../../components/category_accordion_table';
import { useSiemReadinessCases } from '../../../hooks/use_siem_readiness_cases';
import { useBasePath } from '../../../../common/lib/kibana';
import { QualityWarningPrompt } from './quality_warning_prompt';
import { buildQualityCaseDescription, getQualityCaseTitle } from './quality_add_case_details';
import { ViewCasesButton } from '../../components/view_cases_button';
import type { SiemReadinessTabActiveCategoriesProps } from '../../components/configuration_panel';

const DATA_QUALITY_CASE_TAGS = ['siem-readiness', 'data-quality', 'ecs-compatibility'];

// Extended IndexInfo with computed fields
interface IndexInfoWithStatus extends IndexInfo, Record<string, unknown> {
  status: 'incompatible' | 'healthy';
  incompatibleFieldCount: number;
  checkedAt: number | undefined;
}

export const QualityTab: React.FC<SiemReadinessTabActiveCategoriesProps> = ({
  activeCategories,
}) => {
  const basePath = useBasePath();
  const { openNewCaseFlyout } = useSiemReadinessCases();
  const { getReadinessCategories, getIndexQualityResultsLatest } = useSiemReadinessApi();
  const { data: getReadinessCategoriesData } = getReadinessCategories;
  const { data: getIndexQualityData } = getIndexQualityResultsLatest;

  // Create a lookup map for index results by indexName
  const indexDataQualityMap = useMemo(() => {
    if (!getIndexQualityData) return new Map<string, DataQualityResultDocument>();

    return new Map(getIndexQualityData.map((result) => [result.indexName, result]));
  }, [getIndexQualityData]);

  // Prepare categories data with computed status field, filtered by active categories
  const categories: Array<CategoryData<IndexInfoWithStatus>> = useMemo(() => {
    if (!getReadinessCategoriesData?.mainCategoriesMap) return [];

    const activeOnly = getReadinessCategoriesData.mainCategoriesMap.filter((category) =>
      activeCategories.includes(category.category as MainCategories)
    );

    const withStatus = activeOnly.map((category) => ({
      category: category.category,
      items: category.indices.map((index) => {
        const result = indexDataQualityMap.get(index.indexName);
        const incompatibleCount = result?.incompatibleFieldCount ?? 0;

        return {
          ...index,
          status: incompatibleCount > 0 ? ('incompatible' as const) : ('healthy' as const),
          incompatibleFieldCount: incompatibleCount,
          checkedAt: result?.checkedAt,
        };
      }),
    }));

    return withStatus.filter((category) => category.items.length > 0);
  }, [getReadinessCategoriesData?.mainCategoriesMap, indexDataQualityMap, activeCategories]);

  // Calculate total incompatible indices
  const totalIncompatibleIndices = useMemo(() => {
    return categories.reduce(
      (sum, category) =>
        sum + category.items.filter((item) => item.status === 'incompatible').length,
      0
    );
  }, [categories]);

  const hasIncompatibleIndices = totalIncompatibleIndices > 0;

  // Case description
  const caseDescription = useMemo(
    () => buildQualityCaseDescription(categories, basePath),
    [categories, basePath]
  );

  const handleCreateCase = useCallback(() => {
    openNewCaseFlyout({
      title: getQualityCaseTitle(),
      description: caseDescription,
      tags: DATA_QUALITY_CASE_TAGS,
    });
  }, [openNewCaseFlyout, caseDescription]);

  // Render function for accordion extra action (right side badges/stats)
  const renderExtraAction = (category: CategoryData<IndexInfoWithStatus>) => {
    const hasIncompatibleFields = category.items.some((item) => item.incompatibleFieldCount > 0);
    const status = hasIncompatibleFields ? 'Actions required' : 'Healthy';
    const statusColor = hasIncompatibleFields ? 'warning' : 'success';

    const totalIncompatibleFields = category.items.reduce(
      (sum, item) => sum + item.incompatibleFieldCount,
      0
    );

    const affectedIndices = new Set(
      category.items.filter((item) => item.incompatibleFieldCount > 0).map((item) => item.indexName)
    ).size;

    const totalDataSources = category.items.length;

    return (
      <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false}>
        <EuiFlexItem grow={false}>
          <EuiText size="xs" color="subdued">
            {i18n.translate('xpack.securitySolution.siemReadiness.quality.status.label', {
              defaultMessage: 'Status:',
            })}
          </EuiText>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiBadge color={statusColor}>{status}</EuiBadge>
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
          <EuiBadge color="hollow">{totalIncompatibleFields}</EuiBadge>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiText size="xs" color="subdued">
            {'|'}
          </EuiText>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiText size="xs" color="subdued">
            {i18n.translate('xpack.securitySolution.siemReadiness.quality.affectedIndices.label', {
              defaultMessage: 'Affected indices:',
            })}
          </EuiText>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiBadge color="hollow">{`${affectedIndices}/${totalDataSources}`}</EuiBadge>
        </EuiFlexItem>
      </EuiFlexGroup>
    );
  };

  // Filter options for the component
  const filterOptions: FilterOption[] = [
    {
      value: 'all',
      label: i18n.translate('xpack.securitySolution.siemReadiness.quality.filter.all', {
        defaultMessage: 'All',
      }),
    },
    {
      value: 'incompatible',
      label: i18n.translate('xpack.securitySolution.siemReadiness.quality.filter.incompatible', {
        defaultMessage: 'Incompatible',
      }),
    },
    {
      value: 'healthy',
      label: i18n.translate('xpack.securitySolution.siemReadiness.quality.filter.healthy', {
        defaultMessage: 'Healthy',
      }),
    },
  ];

  // Define columns for the data source table
  const columns: Array<EuiBasicTableColumn<IndexInfoWithStatus>> = useMemo(
    () => [
      {
        field: 'indexName',
        name: i18n.translate('xpack.securitySolution.siemReadiness.quality.table.column.indices', {
          defaultMessage: 'Indices',
        }),
        sortable: true,
        truncateText: true,
        width: '40%',
      },
      {
        field: 'incompatibleFieldCount',
        name: i18n.translate(
          'xpack.securitySolution.siemReadiness.quality.table.column.incompatibleFields',
          {
            defaultMessage: 'Incompatible fields',
          }
        ),
        sortable: true,
        width: '15%',
        render: (incompatibleFieldCount: number) => {
          return <strong>{incompatibleFieldCount}</strong>;
        },
      },
      {
        field: 'checkedAt',
        name: i18n.translate(
          'xpack.securitySolution.siemReadiness.quality.table.column.lastChecked',
          {
            defaultMessage: 'Last checked',
          }
        ),
        sortable: (item: IndexInfoWithStatus) => item?.checkedAt ?? 0,
        width: '15%',
        render: (checkedAt: number | undefined) => {
          if (!checkedAt) {
            return i18n.translate(
              'xpack.securitySolution.siemReadiness.quality.lastChecked.never',
              {
                defaultMessage: 'Never',
              }
            );
          }
          return moment(checkedAt).fromNow();
        },
      },
      {
        name: i18n.translate('xpack.securitySolution.siemReadiness.quality.table.column.status', {
          defaultMessage: 'Status',
        }),
        field: 'status',
        sortable: true,
        width: '15%',
        render: (status: 'incompatible' | 'healthy') => {
          const isIncompatible = status === 'incompatible';
          return (
            <EuiBadge color={isIncompatible ? 'danger' : 'success'}>
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
        render: () => {
          const dataQualityUrl = `${basePath}/app/security/data_quality`;
          return (
            <div style={{ textAlign: 'right' }}>
              <EuiButtonEmpty
                size="xs"
                href={dataQualityUrl}
                target="_blank"
                iconType="popout"
                iconSide="right"
              >
                {i18n.translate('xpack.securitySolution.siemReadiness.quality.action.view', {
                  defaultMessage: 'View Data quality',
                })}
              </EuiButtonEmpty>
            </div>
          );
        },
      },
    ],
    [basePath]
  );

  if (getReadinessCategories.isLoading) {
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

  if (getReadinessCategories.error) {
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
          <p>{(getReadinessCategories.error as Error).message}</p>
        </EuiCallOut>
      </>
    );
  }

  if (categories.length === 0) {
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
              defaultMessage: 'No category data found. Please check your indices.',
            })}
          </p>
        </EuiCallOut>
      </>
    );
  }

  return (
    <>
      <EuiSpacer size="m" />
      {hasIncompatibleIndices && (
        <>
          <QualityWarningPrompt incompatibleIndicesCount={totalIncompatibleIndices} />
          <EuiSpacer size="m" />
        </>
      )}
      <EuiFlexGroup justifyContent="spaceBetween" alignItems="center">
        <EuiFlexItem>
          <EuiText size="s" color="subdued">
            {i18n.translate('xpack.securitySolution.siemReadiness.quality.description', {
              defaultMessage:
                'See which indices fail ECS checks or have missing fields. Schema errors can stop rules, dashboards, and correlations from working correctly.',
            })}
          </EuiText>
        </EuiFlexItem>
        {hasIncompatibleIndices && (
          <>
            <EuiFlexItem grow={false}>
              <ViewCasesButton caseTagsArray={DATA_QUALITY_CASE_TAGS} />
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiButtonEmpty
                iconSide="right"
                size="s"
                iconType="plusInCircle"
                onClick={handleCreateCase}
                data-test-subj="createNewCaseButton"
              >
                {i18n.translate('xpack.securitySolution.siemReadiness.quality.createCase', {
                  defaultMessage: 'Create new case',
                })}
              </EuiButtonEmpty>
            </EuiFlexItem>
          </>
        )}
      </EuiFlexGroup>
      <EuiSpacer size="m" />
      <CategoryAccordionTable
        categories={categories}
        columns={columns}
        renderExtraAction={renderExtraAction}
        searchField="indexName"
        filterField="status"
        searchPlaceholder={i18n.translate(
          'xpack.securitySolution.siemReadiness.quality.searchPlaceholder',
          {
            defaultMessage: 'Search indices...',
          }
        )}
        filterOptions={filterOptions}
        itemName={i18n.translate('xpack.securitySolution.siemReadiness.quality.itemName', {
          defaultMessage: 'indices',
        })}
        defaultSortField="indexName"
      />
    </>
  );
};
