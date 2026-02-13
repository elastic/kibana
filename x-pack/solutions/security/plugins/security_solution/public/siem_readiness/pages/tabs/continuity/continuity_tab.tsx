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
import type { SiemReadinessTabActiveCategoriesProps } from '../../components/configuration_panel';
import { useSiemReadinessCases } from '../../../hooks/use_siem_readiness_cases';
import { useBasePath } from '../../../../common/lib/kibana';
import { ContinuityWarningPrompt } from './continuity_warning_prompt';
import {
  buildContinuityCaseDescription,
  getContinuityCaseTitle,
  getContinuityCaseTags,
} from './continuity_add_case_details';
import { ViewCasesButton } from '../../components/view_cases_button';

const DATA_CONTINUITY_CASE_TAGS = ['siem-readiness', 'data-continuity', 'ingest-pipelines'];
// Extended PipelineStats with computed fields and Record<string, unknown> for CategoryAccordionTable

export interface PipelineInfoWithStatus extends PipelineStats, Record<string, unknown> {
  failureRate: string;
  status: 'healthy' | 'critical';
}

export const getDocInjectionFailRate = (failedDocsCount: number, docsCount: number): string => {
  return docsCount > 0 ? ((failedDocsCount / docsCount) * 100).toFixed(1) : '0.0';
};

export const isCriticalFailureRate = (failureRate: string): boolean => {
  return Number(failureRate) >= 1;
};

export const getDocInjectionStatus = (failureRate: string): 'healthy' | 'critical' => {
  return isCriticalFailureRate(failureRate) ? 'critical' : 'healthy';
};

export const getIngestPipelineUrl = (basePath: string, pipelineName: string): string => {
  return `${basePath}/app/management/ingest/ingest_pipelines?pipeline=${encodeURIComponent(
    pipelineName
  )}`;
};

export const ContinuityTab: React.FC<SiemReadinessTabActiveCategoriesProps> = ({
  activeCategories,
}) => {
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
  const categorizedPipelines: Array<CategoryData<PipelineInfoWithStatus>> = useMemo(() => {
    if (!pipelinesData?.length) return [];

    const categoryPipelinesMap = new Map<string, PipelineInfoWithStatus[]>();

    pipelinesData.forEach((pipeline) => {
      const failureRate = getDocInjectionFailRate(pipeline.failedDocsCount, pipeline.docsCount);

      const pipelineWithStats: PipelineInfoWithStatus = {
        ...pipeline,
        failureRate,
        status: getDocInjectionStatus(failureRate),
      };

      // Get unique categories for this pipeline
      const uniqueCategories = new Set<string>();
      pipeline.indices.forEach((indexName) => {
        const category = indexToCategoryMap.get(indexName);
        if (category) uniqueCategories.add(category);
      });

      // Add pipeline to each category (once per category)
      uniqueCategories.forEach((category) => {
        const pipelinesInCategory = categoryPipelinesMap.get(category) || [];
        pipelinesInCategory.push(pipelineWithStats);
        categoryPipelinesMap.set(category, pipelinesInCategory);
      });
    });

    // Build result in category order, filtered by active categories
    const result: Array<CategoryData<PipelineInfoWithStatus>> = [];
    activeCategories.forEach((category) => {
      const items = categoryPipelinesMap.get(category);
      if (!items) return;

      result.push({
        category,
        items,
      });
    });

    return result;
  }, [pipelinesData, indexToCategoryMap, activeCategories]);

  // Check if any pipeline has failures
  const hasDocCriticalFailures = useMemo(() => {
    return categorizedPipelines.some((category) =>
      category.items.some((pipeline) => pipeline.status === 'critical')
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
  const columns: Array<EuiBasicTableColumn<PipelineInfoWithStatus>> = useMemo(
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
        field: 'docsCount',
        name: i18n.translate(
          'xpack.securitySolution.siemReadiness.continuity.column.docsIngested',
          {
            defaultMessage: 'Docs Ingested',
          }
        ),
        sortable: true,
        render: (docsCount: number) => docsCount.toLocaleString(),
        width: '20%',
      },
      {
        field: 'failedDocsCount',
        name: i18n.translate('xpack.securitySolution.siemReadiness.continuity.column.failedDocs', {
          defaultMessage: 'Failed Docs',
        }),
        sortable: true,
        render: (failedDocsCount: number) => failedDocsCount.toLocaleString(),
        width: '15%',
      },
      {
        field: 'failureRate',
        name: i18n.translate('xpack.securitySolution.siemReadiness.continuity.column.failureRate', {
          defaultMessage: 'Failure Rate',
        }),
        sortable: true,
        render: (failureRate: string) => `${failureRate}%`,
        width: '15%',
      },
      {
        field: 'failureRate',
        name: i18n.translate('xpack.securitySolution.siemReadiness.continuity.column.status', {
          defaultMessage: 'Status',
        }),
        render: (failureRate: string) => {
          const isCritical = Number(failureRate) > 1;
          return (
            <EuiBadge color={isCritical ? 'danger' : 'success'}>
              {isCritical
                ? i18n.translate(
                    'xpack.securitySolution.siemReadiness.continuity.status.criticalFailureRate',
                    {
                      defaultMessage: 'Critical failure rate',
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
        render: (pipelineName: string, item: PipelineInfoWithStatus) => (
          <EuiButtonEmpty
            size="s"
            href={getIngestPipelineUrl(basePath, pipelineName)}
            target="_blank"
          >
            {isCriticalFailureRate(item.failureRate)
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
    [basePath]
  );

  // Render function for accordion extra action (right side badges/stats)
  const renderExtraAction = (category: CategoryData<PipelineInfoWithStatus>) => {
    const totalPipelines = category.items.length;
    const totalDocs = category.items.reduce((sum, p) => sum + p.docsCount, 0);
    const totalFailed = category.items.reduce((sum, p) => sum + p.failedDocsCount, 0);
    const overallFailureRate = getDocInjectionFailRate(totalFailed, totalDocs);
    const isCritical = isCriticalFailureRate(overallFailureRate);

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
          <EuiBadge color={isCritical ? 'warning' : 'success'}>
            {isCritical
              ? i18n.translate(
                  'xpack.securitySolution.siemReadiness.continuity.status.actionsRequired',
                  {
                    defaultMessage: 'Actions required',
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
          <EuiBadge color="hollow">{`${overallFailureRate}%`}</EuiBadge>
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

  if (categorizedPipelines.length === 0) {
    return (
      <>
        <EuiSpacer size="m" />
        <EuiCallOut
          title={i18n.translate(
            'xpack.securitySolution.siemReadiness.continuity.noCategoryData.title',
            {
              defaultMessage: 'No data available',
            }
          )}
          color="primary"
          iconType="iInCircle"
          announceOnMount
        >
          <p>
            {i18n.translate(
              'xpack.securitySolution.siemReadiness.continuity.noCategoryData.description',
              {
                defaultMessage: 'No pipeline data found for the selected categories.',
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
      {hasDocCriticalFailures && (
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
        {hasDocCriticalFailures && (
          <>
            <EuiFlexItem grow={false}>
              <ViewCasesButton caseTagsArray={DATA_CONTINUITY_CASE_TAGS} />
            </EuiFlexItem>
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
          </>
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
            value: 'critical',
            label: i18n.translate(
              'xpack.securitySolution.siemReadiness.continuity.filter.criticalFailureRate',
              {
                defaultMessage: 'Critical failure rate',
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
        defaultSortField="docsCount"
        defaultSortDirection="desc"
      />
    </>
  );
};

ContinuityTab.displayName = 'ContinuityTab';
