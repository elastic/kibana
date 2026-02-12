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
import { useSiemReadinessApi } from '@kbn/siem-readiness';
import type { RetentionInfo, RetentionStatus } from '@kbn/siem-readiness';
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

const RETENTION_CASE_TAGS = ['siem-readiness', 'retention', 'data-lifecycle'];

// Extended RetentionInfo for table compatibility
interface RetentionInfoWithStatus extends RetentionInfo, Record<string, unknown> {}

export const RetentionTab: React.FC = () => {
  const basePath = useBasePath();
  const { openNewCaseFlyout } = useSiemReadinessCases();
  const { getReadinessCategories, getReadinessRetention } = useSiemReadinessApi();
  const { data: categoriesData, isLoading: categoriesLoading, error: categoriesError } = getReadinessCategories;
  const { data: retentionData, isLoading: retentionLoading, error: retentionError } = getReadinessRetention;

  const isLoading = categoriesLoading || retentionLoading;
  const error = categoriesError || retentionError;

  // Match data streams to categories by checking if backing index contains data stream name
  // Backing index format: .ds-{data-stream-name}-{date}-{generation}
  const categories: Array<CategoryData<RetentionInfoWithStatus>> = useMemo(() => {
    if (!categoriesData?.mainCategoriesMap || !retentionData?.items) return [];

    return categoriesData.mainCategoriesMap
      .map((category) => {
        // Find retention items where any backing index in this category contains the data stream name
        const matchingRetention = retentionData.items.filter((retention) =>
          category.indices.some((index) => index.indexName.includes(retention.indexName))
        );

        return {
          category: category.category,
          items: matchingRetention as RetentionInfoWithStatus[],
        };
      })
      .filter((cat) => cat.items.length > 0);
  }, [categoriesData?.mainCategoriesMap, retentionData?.items]);

  // Calculate non-compliant statistics
  const nonCompliantStats = useMemo(() => {
    let totalNonCompliant = 0;
    let totalUnknown = 0;

    categories.forEach((category) => {
      category.items.forEach((item) => {
        if (item.status === 'non-compliant') totalNonCompliant++;
        if (item.status === 'unknown') totalUnknown++;
      });
    });

    return { totalNonCompliant, totalUnknown, hasIssues: totalNonCompliant > 0 || totalUnknown > 0 };
  }, [categories]);

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
  const renderExtraAction = (category: CategoryData<RetentionInfoWithStatus>) => {
    const nonCompliantCount = category.items.filter((item) => item.status === 'non-compliant').length;
    const unknownCount = category.items.filter((item) => item.status === 'unknown').length;

    const hasIssues = nonCompliantCount > 0 || unknownCount > 0;

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
    {
      value: 'unknown',
      label: i18n.translate('xpack.securitySolution.siemReadiness.retention.filter.unknown', {
        defaultMessage: 'Unknown',
      }),
    },
  ];

  // Define columns for the data stream table
  const columns: Array<EuiBasicTableColumn<RetentionInfoWithStatus>> = useMemo(
    () => [
      {
        field: 'indexName',
        name: i18n.translate(
          'xpack.securitySolution.siemReadiness.retention.table.column.dataStream',
          {
            defaultMessage: 'Data stream',
          }
        ),
        sortable: true,
        truncateText: true,
        width: '35%',
      },
      {
        field: 'retentionPeriod',
        name: i18n.translate(
          'xpack.securitySolution.siemReadiness.retention.table.column.currentRetention',
          {
            defaultMessage: 'Current retention',
          }
        ),
        sortable: (item: RetentionInfoWithStatus) => item?.retentionDays ?? 0,
        width: '20%',
        render: (retentionPeriod: string | null, item: RetentionInfoWithStatus) => {
          if (!retentionPeriod) {
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
        name: i18n.translate(
          'xpack.securitySolution.siemReadiness.retention.table.column.baselineRetentionFedRAMP',
          {
            defaultMessage: 'Baseline retention (FedRAMP)',
          }
        ),
        width: '20%',
        render: () => {
          return i18n.translate(
            'xpack.securitySolution.siemReadiness.retention.baseline.value',
            {
              defaultMessage: '12 months',
            }
          );
        },
      },
      {
        name: i18n.translate(
          'xpack.securitySolution.siemReadiness.retention.table.column.status',
          {
            defaultMessage: 'Status',
          }
        ),
        field: 'status',
        sortable: true,
        width: '15%',
        render: (status: RetentionStatus) => {
          const statusConfig: Record<
            RetentionStatus,
            { color: 'success' | 'danger' | 'default'; label: string }
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
            unknown: {
              color: 'default',
              label: i18n.translate(
                'xpack.securitySolution.siemReadiness.retention.status.unknown',
                {
                  defaultMessage: 'Unknown',
                }
              ),
            },
          };

          const config = statusConfig[status];
          return <EuiBadge color={config.color}>{config.label}</EuiBadge>;
        },
      },
      {
        name: i18n.translate(
          'xpack.securitySolution.siemReadiness.retention.table.column.action',
          {
            defaultMessage: 'Action',
          }
        ),
        width: '10%',
        render: () => {
          const ilmPoliciesUrl = `${basePath}/app/management/data/index_lifecycle_management/policies`;
          return (
            <div style={{ textAlign: 'right' }}>
              <EuiButtonEmpty
                size="xs"
                href={ilmPoliciesUrl}
                target="_blank"
                iconType="popout"
                iconSide="right"
              >
                {i18n.translate('xpack.securitySolution.siemReadiness.retention.action.view', {
                  defaultMessage: 'View ILM policies',
                })}
              </EuiButtonEmpty>
            </div>
          );
        },
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

  if (categories.length === 0) {
    return (
      <>
        <EuiSpacer size="m" />
        <EuiCallOut
          title={i18n.translate('xpack.securitySolution.siemReadiness.retention.noData.title', {
            defaultMessage: 'No data streams found',
          })}
          color="primary"
          iconType="iInCircle"
          announceOnMount
        >
          <p>
            {i18n.translate(
              'xpack.securitySolution.siemReadiness.retention.noData.description',
              {
                defaultMessage: 'No data streams with security-relevant data were found.',
              }
            )}
          </p>
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
      <CategoryAccordionTable<RetentionInfoWithStatus>
        categories={categories}
        columns={columns}
        filterOptions={filterOptions}
        searchField="indexName"
        filterField="status"
        renderExtraAction={renderExtraAction}
        defaultSortField="retentionDays"
        defaultSortDirection="asc"
        itemName="indices"
      />
    </>
  );
};
