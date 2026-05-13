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
  EuiProgress,
  useEuiTheme,
} from '@elastic/eui';
import type { EuiBasicTableColumn } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import moment from 'moment';
import { useSiemReadinessApi, CATEGORY_ORDER } from '@kbn/siem-readiness';
import type { CompiledQualityIndex, MainCategories } from '@kbn/siem-readiness';
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
import { useAutoCheckIndices } from './use_auto_check_indices';
import { SIEM_READINESS_ACCORDIONS_STORAGE_KEY } from '../../../constants';

const DATA_QUALITY_CASE_TAGS = ['siem-readiness', 'data-quality', 'ecs-compatibility'];

/** EuiBasicTable requires rows to satisfy Record<string, unknown>; this intersection provides it. */
type QualityIndexRow = CompiledQualityIndex & Record<string, unknown>;

const makeUncheckedRow = (indexName: string): QualityIndexRow => ({
  indexName,
  status: 'healthy',
  incompatibleFieldCount: 0,
  sameFamilyFieldCount: 0,
  ecsFieldCount: 0,
  customFieldCount: 0,
  totalFieldCount: 0,
  docsCount: 0,
  lastChecked: null,
  ecsVersion: null,
  error: null,
});

export const QualityTab: React.FC<SiemReadinessTabActiveCategoriesProps> = ({
  activeCategories,
}) => {
  const { euiTheme } = useEuiTheme();
  const basePath = useBasePath();
  const { openNewCaseFlyout } = useSiemReadinessCases();
  const { getReadinessQuality } = useSiemReadinessApi();
  const { data: qualityData, isLoading, error } = getReadinessQuality;

  // Full index list (checked + unchecked) for active categories — drives auto-check
  const allIndexNames = useMemo(() => {
    if (!qualityData?.byCategory) return [];

    return qualityData.byCategory
      .filter((c) => activeCategories.includes(c.category as MainCategories))
      .flatMap((c) => [...c.indices.map((i) => i.indexName), ...c.uncheckedIndices]);
  }, [qualityData?.byCategory, activeCategories]);

  // Auto-check all indices when tab is visited
  const { isChecking, isComplete, progress, currentIndexName } = useAutoCheckIndices({
    indexNames: allIndexNames,
    enabled: !isLoading && allIndexNames.length > 0,
  });

  // Build category rows: checked indices from compiled data + placeholder rows for unchecked
  const categories: Array<CategoryData<QualityIndexRow>> = useMemo(() => {
    if (!qualityData?.byCategory) return [];

    return qualityData.byCategory
      .filter(
        (c) => activeCategories.includes(c.category as MainCategories) && c.totalActiveIndices > 0
      )
      .map((c) => ({
        category: c.category,
        items: [...(c.indices as QualityIndexRow[]), ...c.uncheckedIndices.map(makeUncheckedRow)],
      }));
  }, [qualityData?.byCategory, activeCategories]);

  // Total incompatible across active categories
  const totalIncompatibleIndices = useMemo(() => {
    if (!qualityData?.byCategory) return 0;
    return qualityData.byCategory
      .filter((c) => activeCategories.includes(c.category as MainCategories))
      .reduce((sum, c) => sum + c.incompatibleCount, 0);
  }, [qualityData?.byCategory, activeCategories]);

  const hasIncompatibleIndices = totalIncompatibleIndices > 0;

  const hasUnfilteredData = Boolean(qualityData?.byCategory?.length);

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
  const renderExtraAction = (category: CategoryData<QualityIndexRow>) => {
    const hasIncompatibleFields = category.items.some((item) => item.status === 'incompatible');
    const statusColor = hasIncompatibleFields ? 'warning' : 'success';

    const totalIncompatibleFields = category.items.reduce(
      (sum, item) => sum + item.incompatibleFieldCount,
      0
    );

    const affectedIndices = category.items.filter((item) => item.status === 'incompatible').length;
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
          <EuiBadge color={statusColor}>
            {hasIncompatibleFields
              ? i18n.translate(
                  'xpack.securitySolution.siemReadiness.quality.status.actionsRequired',
                  { defaultMessage: 'Actions required' }
                )
              : i18n.translate('xpack.securitySolution.siemReadiness.quality.status.healthy', {
                  defaultMessage: 'Healthy',
                })}
          </EuiBadge>
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

  const columns: Array<EuiBasicTableColumn<QualityIndexRow>> = useMemo(
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
        render: (incompatibleFieldCount: number) => <strong>{incompatibleFieldCount}</strong>,
      },
      {
        field: 'lastChecked',
        name: i18n.translate(
          'xpack.securitySolution.siemReadiness.quality.table.column.lastChecked',
          {
            defaultMessage: 'Last checked',
          }
        ),
        sortable: (item: QualityIndexRow) =>
          item.lastChecked ? new Date(item.lastChecked as string).getTime() : 0,
        width: '15%',
        render: (lastChecked: string | null) => {
          if (!lastChecked) {
            return i18n.translate(
              'xpack.securitySolution.siemReadiness.quality.lastChecked.never',
              { defaultMessage: 'Never' }
            );
          }
          return moment(lastChecked).fromNow();
        },
      },
      {
        field: 'status',
        name: i18n.translate('xpack.securitySolution.siemReadiness.quality.table.column.status', {
          defaultMessage: 'Status',
        }),
        sortable: true,
        width: '15%',
        render: (status: 'incompatible' | 'healthy') => {
          const isIncompatible = status === 'incompatible';
          return (
            <EuiBadge color={isIncompatible ? 'danger' : 'success'}>
              {isIncompatible
                ? i18n.translate(
                    'xpack.securitySolution.siemReadiness.quality.status.incompatible',
                    { defaultMessage: 'Incompatible' }
                  )
                : i18n.translate('xpack.securitySolution.siemReadiness.quality.status.healthy', {
                    defaultMessage: 'Healthy',
                  })}
            </EuiBadge>
          );
        },
      },
      {
        field: 'indexName' as const,
        name: i18n.translate('xpack.securitySolution.siemReadiness.quality.table.column.action', {
          defaultMessage: 'Actions',
        }),
        actions: [
          {
            render: () => (
              <EuiButtonEmpty
                size="s"
                href={`${basePath}/app/security/data_quality`}
                target="_blank"
              >
                {i18n.translate('xpack.securitySolution.siemReadiness.quality.action.view', {
                  defaultMessage: 'View Data quality',
                })}
              </EuiButtonEmpty>
            ),
          },
        ],
      },
    ],
    [basePath]
  );

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

  return (
    <>
      <EuiSpacer size="m" />
      {hasIncompatibleIndices && (
        <>
          <QualityWarningPrompt incompatibleIndicesCount={totalIncompatibleIndices} />
          <EuiSpacer size="m" />
        </>
      )}
      {(isChecking || isComplete) && (
        <EuiProgress
          value={progress.checked}
          max={progress.total}
          size="s"
          color={isComplete ? 'success' : 'primary'}
          label={
            isComplete
              ? i18n.translate('xpack.securitySolution.siemReadiness.quality.complete.label', {
                  defaultMessage: 'All indices checked',
                })
              : i18n.translate('xpack.securitySolution.siemReadiness.quality.checking.label', {
                  defaultMessage: 'Checking: {indexName}',
                  values: { indexName: currentIndexName },
                })
          }
          valueText={`${progress.checked}/${progress.total}`}
          style={{ marginBottom: euiTheme.size.base }}
        />
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
                iconType="plusCircle"
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
          { defaultMessage: 'Search indices...' }
        )}
        filterOptions={filterOptions}
        itemName={i18n.translate('xpack.securitySolution.siemReadiness.quality.itemName', {
          defaultMessage: 'indices',
        })}
        defaultSortField="indexName"
        storageKey={SIEM_READINESS_ACCORDIONS_STORAGE_KEY}
        isFilterActive={activeCategories.length < CATEGORY_ORDER.length && hasUnfilteredData}
        hasUnfilteredData={hasUnfilteredData}
      />
    </>
  );
};
