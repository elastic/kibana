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
import type { PipelineStats } from '@kbn/siem-readiness';
import {
  CategoryAccordionTable,
  type CategoryData,
} from '../../components/category_accordion_table';
import { useSiemReadinessCases } from '../../../hooks/use_siem_readiness_cases';
import { useBasePath } from '../../../../common/lib/kibana';
import { ContinuityWarningPrompt } from './continuity_warning_prompt';
import {
  buildContinuityCaseDescription,
  getContinuityCaseTitle,
  getContinuityCaseTags,
} from './continuity_add_case_details';

// Extended PipelineStats with computed fields and Record<string, unknown> for CategoryAccordionTable
interface PipelineWithCategory extends PipelineStats, Record<string, unknown> {
  failureRate: string;
  status: 'healthy' | 'non_healthy';
}

export const ContinuityTab: React.FC = () => {
  const basePath = useBasePath();
  const { openNewCaseFlyout } = useSiemReadinessCases();
  const { getReadinessCategories, getReadinessPipelines } = useSiemReadinessApi();
  const { data: categoriesData, isLoading: categoriesLoading } = getReadinessCategories;
  const { data: pipelinesData, isLoading: pipelinesLoading } = getReadinessPipelines;

  // Build index → category mapping from getReadinessCategories
  const indexToCategoryMap = useMemo(() => {
    const map = new Map<string, string>();

    if (!categoriesData?.mainCategoriesMap) return map;

    categoriesData.mainCategoriesMap.forEach(({ category, indices }) => {
      indices.forEach(({ indexName }) => {
        map.set(indexName, category);
      });
    });

    return map;
  }, [categoriesData?.mainCategoriesMap]);

  // Group pipelines by category based on their associated indices
  const categorizedPipelines: Array<CategoryData<PipelineWithCategory>> = useMemo(() => {
    if (!pipelinesData?.length) return [];

    const categoryOrder = ['Endpoint', 'Identity', 'Network', 'Cloud', 'Application/SaaS'];

    const categoryMap = pipelinesData.reduce((map, pipeline) => {
      const failureRate =
        pipeline.count > 0 ? ((pipeline.failed / pipeline.count) * 100).toFixed(2) : '0.00';

      const pipelineWithStats: PipelineWithCategory = {
        ...pipeline,
        failureRate,
        status: pipeline.failed > 0 ? 'non_healthy' : 'healthy',
      };

      const categories = new Set(
        pipeline.indices
          .map((indexName) => indexToCategoryMap.get(indexName))
          .filter((category): category is string => Boolean(category))
      );

      categories.forEach((category) => {
        const list = map.get(category) ?? [];
        list.push(pipelineWithStats);
        map.set(category, list);
      });

      return map;
    }, new Map<string, PipelineWithCategory[]>());

    return categoryOrder
      .filter((category) => categoryMap.has(category))
      .map((category) => ({
        category,
        items: [...(categoryMap.get(category) ?? [])].sort((a, b) => b.count - a.count),
      }));
  }, [pipelinesData, indexToCategoryMap]);

  // Check if any pipeline has failures
  const hasDocFailures = useMemo(() => {
    return categorizedPipelines.some((category) =>
      category.items.some((pipeline) => pipeline.failed > 0)
    );
  }, [categorizedPipelines]);

  // Case description
  const caseDescription = useMemo(
    () => buildContinuityCaseDescription(categorizedPipelines, basePath),
    [categorizedPipelines, basePath]
  );

  const handleCreateCase = useCallback(() => {
    openNewCaseFlyout({
      title: getContinuityCaseTitle(),
      description: caseDescription,
      tags: getContinuityCaseTags(),
    });
  }, [openNewCaseFlyout, caseDescription]);

  // Table columns
  const columns: Array<EuiBasicTableColumn<PipelineWithCategory>> = useMemo(
    () => [
      {
        field: 'name',
        name: i18n.translate('xpack.securitySolution.siemReadiness.continuity.column.name', {
          defaultMessage: 'Pipeline Name',
        }),
        sortable: true,
        truncateText: true,
        width: '30%',
      },
      {
        field: 'count',
        name: i18n.translate(
          'xpack.securitySolution.siemReadiness.continuity.column.docsIngested',
          {
            defaultMessage: 'Docs Ingested',
          }
        ),
        sortable: true,
        render: (count: number) => count.toLocaleString(),
        width: '20%',
      },
      {
        field: 'failed',
        name: i18n.translate('xpack.securitySolution.siemReadiness.continuity.column.failedDocs', {
          defaultMessage: 'Failed Docs',
        }),
        sortable: true,
        render: (failed: number) => (
          <EuiBadge color={failed > 0 ? 'danger' : 'default'}>{failed.toLocaleString()}</EuiBadge>
        ),
        width: '15%',
      },
      {
        field: 'failureRate',
        name: i18n.translate('xpack.securitySolution.siemReadiness.continuity.column.failureRate', {
          defaultMessage: 'Failure Rate',
        }),
        sortable: true,
        render: (rate: string) => `${rate}%`,
        width: '15%',
      },
      {
        field: 'failed',
        name: i18n.translate('xpack.securitySolution.siemReadiness.continuity.column.status', {
          defaultMessage: 'Status',
        }),
        render: (failed: number) => {
          const hasFailures = failed > 0;
          return (
            <EuiBadge color={hasFailures ? 'danger' : 'success'}>
              {hasFailures
                ? i18n.translate(
                    'xpack.securitySolution.siemReadiness.continuity.status.criticalFailure',
                    {
                      defaultMessage: 'Critical Failure',
                    }
                  )
                : i18n.translate('xpack.securitySolution.siemReadiness.continuity.status.healthy', {
                    defaultMessage: 'Healthy',
                  })}
            </EuiBadge>
          );
        },
        width: '20%',
      },
      {
        field: 'name',
        name: i18n.translate('xpack.securitySolution.siemReadiness.continuity.column.action', {
          defaultMessage: 'Action',
        }),
        render: (pipelineName: string, item: PipelineWithCategory) => (
          <EuiButtonEmpty
            size="s"
            href={`/app/management/ingest/ingest_pipelines?pipeline=${encodeURIComponent(
              pipelineName
            )}`}
            target="_blank"
          >
            {item.failed > 0
              ? i18n.translate(
                  'xpack.securitySolution.siemReadiness.continuity.action.viewFailure',
                  {
                    defaultMessage: 'View Failure',
                  }
                )
              : i18n.translate(
                  'xpack.securitySolution.siemReadiness.continuity.action.viewPipeline',
                  {
                    defaultMessage: 'View Pipeline',
                  }
                )}
          </EuiButtonEmpty>
        ),
        width: '20%',
      },
    ],
    []
  );

  // Render function for accordion extra action (right side badges/stats)
  const renderExtraAction = (category: CategoryData<PipelineWithCategory>) => {
    const totalPipelines = category.items.length;
    const totalDocs = category.items.reduce((sum, p) => sum + p.count, 0);
    const totalFailed = category.items.reduce((sum, p) => sum + p.failed, 0);
    const overallFailureRate =
      totalDocs > 0 ? ((totalFailed / totalDocs) * 100).toFixed(2) : '0.00';
    const hasFailures = totalFailed > 0;

    return (
      <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false}>
        {/* Status */}
        <EuiFlexItem grow={false}>
          <EuiText size="xs" color="subdued">
            {i18n.translate('xpack.securitySolution.siemReadiness.continuity.status.label', {
              defaultMessage: 'Status:',
            })}
          </EuiText>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiBadge color={hasFailures ? 'warning' : 'success'}>
            {hasFailures
              ? i18n.translate(
                  'xpack.securitySolution.siemReadiness.continuity.status.hasFailures',
                  {
                    defaultMessage: 'Has Failures',
                  }
                )
              : i18n.translate('xpack.securitySolution.siemReadiness.continuity.status.healthy', {
                  defaultMessage: 'Healthy',
                })}
          </EuiBadge>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiText size="xs" color="subdued">
            {'|'}
          </EuiText>
        </EuiFlexItem>
        {/* Pipelines */}
        <EuiFlexItem grow={false}>
          <EuiText size="xs" color="subdued">
            {i18n.translate('xpack.securitySolution.siemReadiness.continuity.pipelines.label', {
              defaultMessage: 'Pipelines:',
            })}
          </EuiText>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiBadge color="hollow">{totalPipelines}</EuiBadge>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiText size="xs" color="subdued">
            {'|'}
          </EuiText>
        </EuiFlexItem>
        {/* Docs Ingested */}
        <EuiFlexItem grow={false}>
          <EuiText size="xs" color="subdued">
            {i18n.translate('xpack.securitySolution.siemReadiness.continuity.docsIngested.label', {
              defaultMessage: 'Docs Ingested:',
            })}
          </EuiText>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiBadge color="hollow">{totalDocs.toLocaleString()}</EuiBadge>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiText size="xs" color="subdued">
            {'|'}
          </EuiText>
        </EuiFlexItem>
        {/* Failure Rate */}
        <EuiFlexItem grow={false}>
          <EuiText size="xs" color="subdued">
            {i18n.translate('xpack.securitySolution.siemReadiness.continuity.failureRate.label', {
              defaultMessage: 'Failure Rate:',
            })}
          </EuiText>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiBadge color={hasFailures ? 'warning' : 'hollow'}>{`${overallFailureRate}%`}</EuiBadge>
        </EuiFlexItem>
      </EuiFlexGroup>
    );
  };

  const isLoading = categoriesLoading || pipelinesLoading;

  if (isLoading) {
    return (
      <>
        <EuiSpacer size="l" />
        <EuiFlexGroup justifyContent="center">
          <EuiFlexItem grow={false}>
            <EuiLoadingSpinner size="xl" />
          </EuiFlexItem>
        </EuiFlexGroup>
      </>
    );
  }

  if (!pipelinesData || pipelinesData.length === 0) {
    return (
      <>
        <EuiSpacer size="l" />
        <EuiCallOut
          announceOnMount
          title={i18n.translate('xpack.securitySolution.siemReadiness.continuity.noData.title', {
            defaultMessage: 'No pipeline data available',
          })}
          color="warning"
          iconType="warning"
        >
          <p>
            {i18n.translate('xpack.securitySolution.siemReadiness.continuity.noData.description', {
              defaultMessage:
                'No ingest pipeline statistics were found. This could mean no data has been ingested yet.',
            })}
          </p>
        </EuiCallOut>
      </>
    );
  }

  return (
    <>
      <EuiSpacer size="m" />
      {hasDocFailures && (
        <>
          <ContinuityWarningPrompt />
          <EuiSpacer size="m" />
        </>
      )}
      <EuiFlexGroup justifyContent="spaceBetween" alignItems="center">
        <EuiFlexItem>
          <EuiText size="s" color="subdued">
            {i18n.translate('xpack.securitySolution.siemReadiness.continuity.description', {
              defaultMessage:
                'The following table summarizes the stability of your data by tracking ingest pipeline failure rates across log categories.',
            })}
          </EuiText>
        </EuiFlexItem>
        {hasDocFailures && (
          <EuiFlexItem grow={false}>
            <EuiButtonEmpty
              iconSide="right"
              size="s"
              iconType="plusInCircle"
              onClick={handleCreateCase}
              data-test-subj="createNewCaseButton"
            >
              {i18n.translate('xpack.securitySolution.siemReadiness.continuity.createCase', {
                defaultMessage: 'Create new case',
              })}
            </EuiButtonEmpty>
          </EuiFlexItem>
        )}
      </EuiFlexGroup>
      <EuiSpacer size="m" />
      <CategoryAccordionTable
        categories={categorizedPipelines}
        columns={columns}
        renderExtraAction={renderExtraAction}
        filterField="status"
        defaultFilterValue="all"
        filterOptions={[
          {
            value: 'all',
            label: i18n.translate('xpack.securitySolution.siemReadiness.continuity.filter.all', {
              defaultMessage: 'All',
            }),
          },
          {
            value: 'healthy',
            label: i18n.translate(
              'xpack.securitySolution.siemReadiness.continuity.filter.healthy',
              {
                defaultMessage: 'Healthy',
              }
            ),
          },
          {
            value: 'non_healthy',
            label: i18n.translate(
              'xpack.securitySolution.siemReadiness.continuity.filter.nonHealthy',
              {
                defaultMessage: 'Non-healthy',
              }
            ),
          },
        ]}
        searchField="name"
        searchPlaceholder={i18n.translate(
          'xpack.securitySolution.siemReadiness.continuity.searchPlaceholder',
          { defaultMessage: 'Search pipelines...' }
        )}
        itemName={i18n.translate('xpack.securitySolution.siemReadiness.continuity.itemName', {
          defaultMessage: 'pipelines',
        })}
      />
    </>
  );
};

ContinuityTab.displayName = 'ContinuityTab';
