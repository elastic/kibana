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
import { useSiemReadinessApi, CATEGORY_ORDER } from '@kbn/siem-readiness';
import type { RetentionStatus, CompiledRetentionIndex } from '@kbn/siem-readiness';
import {
  CategoryAccordionTable,
  type CategoryData,
  type FilterOption,
} from '../../components/category_accordion_table';
import { useSiemReadinessCases } from '../../../hooks/use_siem_readiness_cases';
import { useBasePath } from '../../../../common/lib/kibana';
import { RetentionWarningPrompt } from './retention_warning_prompt';
import { buildRetentionCaseDescription, getRetentionCaseTitle } from './retention_add_case_details';
import { ViewCasesButton } from '../../components/view_cases_button';
import type { SiemReadinessTabActiveCategoriesProps } from '../../components/configuration_panel';
import { isRetentionNonCompliant } from '../../../hooks/visibility_status_utils';
import { SIEM_READINESS_ACCORDIONS_STORAGE_KEY } from '../../../constants';

const RETENTION_CASE_TAGS = ['siem-readiness', 'retention', 'data-lifecycle'];

const getIlmPoliciesUrl = (basePath: string, policyName?: string): string => {
  const baseUrl = `${basePath}/app/management/data/index_lifecycle_management/policies`;
  return policyName ? `${baseUrl}?policy=${encodeURIComponent(policyName)}` : baseUrl;
};
const getDataStreamUrl = (basePath: string, dataStreamName: string): string => {
  return `${basePath}/app/management/data/index_management/data_streams/${encodeURIComponent(
    dataStreamName
  )}`;
};
const getIndexDetailsUrl = (basePath: string, indexName: string): string => {
  return `${basePath}/app/management/data/index_management/indices/index_details?indexName=${encodeURIComponent(
    indexName
  )}`;
};

// Extended CompiledRetentionIndex for table compatibility
interface RetentionIndexWithRecord extends CompiledRetentionIndex, Record<string, unknown> {}

export const RetentionTab: React.FC<SiemReadinessTabActiveCategoriesProps> = ({
  activeCategories,
}) => {
  const basePath = useBasePath();
  const { openNewCaseFlyout } = useSiemReadinessCases();
  const { getReadinessRetention } = useSiemReadinessApi();
  const {
    data: retentionData,
    isLoading: retentionLoading,
    error: retentionError,
  } = getReadinessRetention;

  const isLoading = retentionLoading;
  const error = retentionError;

  // Build categories from pre-compiled byCategory data, filtered by activeCategories
  const categories: Array<CategoryData<RetentionIndexWithRecord>> = useMemo(() => {
    if (!retentionData?.byCategory) return [];

    return retentionData.byCategory
      .filter(
        (c) =>
          activeCategories.includes(c.category as (typeof activeCategories)[number]) &&
          c.indices.length > 0
      )
      .map((c) => ({
        category: c.category,
        items: c.indices as RetentionIndexWithRecord[],
      }));
  }, [retentionData?.byCategory, activeCategories]);

  // Check if any category has indices (ignoring active filter)
  const hasUnfilteredData = useMemo(() => {
    return retentionData?.byCategory.some((c) => c.indices.length > 0) ?? false;
  }, [retentionData?.byCategory]);

  // Non-compliant stats from compiled summary
  const nonCompliantStats = useMemo(() => {
    const nonCompliantCount = retentionData?.summary.nonCompliantCount ?? 0;
    return { totalNonCompliant: nonCompliantCount, hasIssues: nonCompliantCount > 0 };
  }, [retentionData?.summary.nonCompliantCount]);

  // Case description
  const caseDescription = useMemo(
    () => buildRetentionCaseDescription(categories, basePath),
    [categories, basePath]
  );

  const handleCreateCase = useCallback(() => {
    openNewCaseFlyout({
      title: getRetentionCaseTitle(),
      description: caseDescription,
      tags: RETENTION_CASE_TAGS,
    });
  }, [openNewCaseFlyout, caseDescription]);

  // Render function for accordion extra action (right side badges/stats)
  const renderExtraAction = (category: CategoryData<RetentionIndexWithRecord>) => {
    const nonCompliantCount = category.items.filter((item) =>
      isRetentionNonCompliant(item.status)
    ).length;

    const hasIssues = nonCompliantCount > 0;

    return (
      <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false}>
        <EuiFlexItem grow={false}>
          <EuiText size="xs" color="subdued">
            {i18n.translate('xpack.securitySolution.siemReadiness.retention.status.label', {
              defaultMessage: 'Status:',
            })}
          </EuiText>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiBadge color={hasIssues ? 'warning' : 'success'}>
            {hasIssues
              ? i18n.translate(
                  'xpack.securitySolution.siemReadiness.retention.accordionStatus.actionsRequired',
                  { defaultMessage: 'Actions required' }
                )
              : i18n.translate(
                  'xpack.securitySolution.siemReadiness.retention.accordionStatus.healthy',
                  { defaultMessage: 'Healthy' }
                )}
          </EuiBadge>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiText size="xs" color="subdued">
            {'|'}
          </EuiText>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiText size="xs" color="subdued">
            {i18n.translate('xpack.securitySolution.siemReadiness.retention.dataStreams.label', {
              defaultMessage: 'Data streams:',
            })}
          </EuiText>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiBadge color="hollow">{category.items.length}</EuiBadge>
        </EuiFlexItem>
      </EuiFlexGroup>
    );
  };

  // Filter options for the component
  const filterOptions: FilterOption[] = [
    {
      value: 'all',
      label: i18n.translate('xpack.securitySolution.siemReadiness.retention.filter.all', {
        defaultMessage: 'All',
      }),
    },
    {
      value: 'non-compliant',
      label: i18n.translate('xpack.securitySolution.siemReadiness.retention.filter.nonCompliant', {
        defaultMessage: 'Non-compliant',
      }),
    },
    {
      value: 'healthy',
      label: i18n.translate('xpack.securitySolution.siemReadiness.retention.filter.healthy', {
        defaultMessage: 'Healthy',
      }),
    },
  ];

  // Define columns for the data stream table
  const columns: Array<EuiBasicTableColumn<RetentionIndexWithRecord>> = useMemo(
    () => [
      {
        field: 'indexName',
        name: i18n.translate(
          'xpack.securitySolution.siemReadiness.retention.table.column.dataStream',
          {
            defaultMessage: 'Data streams/indices',
          }
        ),
        sortable: true,
        truncateText: true,
        width: '30%',
      },
      {
        field: 'managedBy',
        name: i18n.translate(
          'xpack.securitySolution.siemReadiness.retention.table.column.retentionType',
          {
            defaultMessage: 'Managed by',
          }
        ),
        width: '10%',
        render: (managedBy: CompiledRetentionIndex['managedBy']) => {
          if (managedBy === 'None') {
            return (
              <EuiText size="xs" color="subdued">
                {i18n.translate('xpack.securitySolution.siemReadiness.retention.managedBy.none', {
                  defaultMessage: 'None',
                })}
              </EuiText>
            );
          }
          return <EuiText size="xs">{managedBy}</EuiText>;
        },
      },
      {
        field: 'retentionPeriod',
        name: i18n.translate(
          'xpack.securitySolution.siemReadiness.retention.table.column.currentRetention',
          {
            defaultMessage: 'Current retention',
          }
        ),
        sortable: (item: RetentionIndexWithRecord) => item?.retentionDays ?? 0,
        width: '15%',
        render: (retentionPeriod: string, item: RetentionIndexWithRecord) => {
          if (retentionPeriod === 'Not configured') {
            return (
              <EuiText size="xs" color="subdued">
                {i18n.translate(
                  'xpack.securitySolution.siemReadiness.retention.period.notConfigured',
                  {
                    defaultMessage: 'Not configured',
                  }
                )}
              </EuiText>
            );
          }
          const daysText =
            item.retentionDays !== null
              ? i18n.translate('xpack.securitySolution.siemReadiness.retention.period.days', {
                  defaultMessage: '{days} days',
                  values: { days: item.retentionDays },
                })
              : retentionPeriod;
          return <EuiText size="xs">{daysText}</EuiText>;
        },
      },
      {
        field: 'indexName' as const,
        name: i18n.translate(
          'xpack.securitySolution.siemReadiness.retention.table.column.baselineRetentionFedRAMP',
          {
            defaultMessage: 'Baseline retention (FedRAMP)',
          }
        ),
        width: '20%',
        render: () => {
          return i18n.translate('xpack.securitySolution.siemReadiness.retention.baseline.value', {
            defaultMessage: '12 months',
          });
        },
      },
      {
        name: i18n.translate('xpack.securitySolution.siemReadiness.retention.table.column.status', {
          defaultMessage: 'Status',
        }),
        field: 'status',
        sortable: true,
        width: '15%',
        render: (status: RetentionStatus) => {
          const statusConfig: Record<
            RetentionStatus,
            { color: 'success' | 'danger'; label: string }
          > = {
            healthy: {
              color: 'success',
              label: i18n.translate(
                'xpack.securitySolution.siemReadiness.retention.status.healthy',
                {
                  defaultMessage: 'Healthy',
                }
              ),
            },
            'non-compliant': {
              color: 'danger',
              label: i18n.translate(
                'xpack.securitySolution.siemReadiness.retention.status.nonCompliant',
                {
                  defaultMessage: 'Non-compliant',
                }
              ),
            },
          };

          const config = statusConfig[status];
          return <EuiBadge color={config.color}>{config.label}</EuiBadge>;
        },
      },
      {
        field: 'indexName' as const,
        name: i18n.translate(
          'xpack.securitySolution.siemReadiness.retention.table.column.actions',
          {
            defaultMessage: 'Actions',
          }
        ),
        actions: [
          {
            render: (item: RetentionIndexWithRecord) => {
              let href: string;
              let label: string;

              const isDsl = item.managedBy === 'DSL';
              const isUnmanagedDataStream = item.isDataStream && item.managedBy === 'None';
              const isUnmanagedIndex = !item.isDataStream && item.managedBy === 'None';

              if (isDsl || isUnmanagedDataStream) {
                href = getDataStreamUrl(basePath, item.indexName);
                label = i18n.translate(
                  'xpack.securitySolution.siemReadiness.retention.action.viewDataStream',
                  { defaultMessage: 'View Data Stream' }
                );
              } else if (item.managedBy === 'ILM' && item.policyName) {
                href = getIlmPoliciesUrl(basePath, item.policyName);
                label = i18n.translate(
                  'xpack.securitySolution.siemReadiness.retention.action.viewIlm',
                  { defaultMessage: 'View ILM policies' }
                );
              } else if (isUnmanagedIndex) {
                href = getIndexDetailsUrl(basePath, item.indexName);
                label = i18n.translate(
                  'xpack.securitySolution.siemReadiness.retention.action.viewIndex',
                  { defaultMessage: 'View Index' }
                );
              } else {
                return null;
              }

              return (
                <EuiButtonEmpty size="s" href={href} target="_blank">
                  {label}
                </EuiButtonEmpty>
              );
            },
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
          title={i18n.translate('xpack.securitySolution.siemReadiness.retention.error.title', {
            defaultMessage: 'Error loading retention data',
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
      {nonCompliantStats.hasIssues && (
        <>
          <RetentionWarningPrompt />
          <EuiSpacer size="m" />
        </>
      )}
      <EuiFlexGroup justifyContent="spaceBetween" alignItems="center">
        <EuiFlexItem>
          <EuiText size="s" color="subdued">
            {i18n.translate('xpack.securitySolution.siemReadiness.retention.description', {
              defaultMessage:
                'Check if your log data meets recommended retention periods across key categories.',
            })}
          </EuiText>
        </EuiFlexItem>
        {nonCompliantStats.hasIssues && (
          <>
            <EuiFlexItem grow={false}>
              <ViewCasesButton
                caseTagsArray={RETENTION_CASE_TAGS}
                data-test-subj="retentionViewCasesButton"
              />
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiButtonEmpty
                iconSide="right"
                size="s"
                iconType="plusInCircle"
                onClick={handleCreateCase}
                data-test-subj="retentionCreateNewCaseButton"
              >
                {i18n.translate('xpack.securitySolution.siemReadiness.retention.createCase', {
                  defaultMessage: 'Create new case',
                })}
              </EuiButtonEmpty>
            </EuiFlexItem>
          </>
        )}
      </EuiFlexGroup>
      <EuiSpacer size="m" />
      <CategoryAccordionTable<RetentionIndexWithRecord>
        categories={categories}
        columns={columns}
        filterOptions={filterOptions}
        searchField="indexName"
        filterField="status"
        renderExtraAction={renderExtraAction}
        defaultSortField="retentionDays"
        defaultSortDirection="asc"
        itemName="data streams / indices"
        storageKey={SIEM_READINESS_ACCORDIONS_STORAGE_KEY}
        isFilterActive={activeCategories.length < CATEGORY_ORDER.length && hasUnfilteredData}
        hasUnfilteredData={hasUnfilteredData}
      />
    </>
  );
};
