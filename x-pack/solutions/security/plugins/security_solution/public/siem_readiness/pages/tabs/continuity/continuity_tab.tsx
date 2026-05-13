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
  EuiBadge,
  EuiFlexGroup,
  EuiFlexItem,
  EuiText,
  EuiButtonEmpty,
  EuiCallOut,
} from '@elastic/eui';
import type { EuiBasicTableColumn } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { useSiemReadinessApi, CATEGORY_ORDER } from '@kbn/siem-readiness';
import type { CompiledPipeline } from '@kbn/siem-readiness';
import {
  CategoryAccordionTable,
  type CategoryData,
} from '../../components/category_accordion_table';

/** EuiBasicTable requires rows to satisfy Record<string, unknown>; this intersection provides it. */
type CompiledPipelineRow = CompiledPipeline & Record<string, unknown>;
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
import {
  getFailureRateString,
  isCriticalFailureRateFromString,
} from '../../../hooks/visibility_status_utils';
import { SIEM_READINESS_ACCORDIONS_STORAGE_KEY } from '../../../constants';

const DATA_CONTINUITY_CASE_TAGS = ['siem-readiness', 'data-continuity', 'ingest-pipelines'];

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
  const { getReadinessPipelines } = useSiemReadinessApi();

  const { data: pipelinesData, isLoading: pipelinesLoading } = getReadinessPipelines;

  // Stats availability comes directly from compiled summary
  const statsAvailable = pipelinesData?.summary.statsAvailable ?? true;

  // Build categorized pipelines from pre-compiled byCategory data, filtered by activeCategories
  const categorizedPipelines: Array<CategoryData<CompiledPipelineRow>> = useMemo(() => {
    if (!pipelinesData?.byCategory) return [];

    return pipelinesData.byCategory
      .filter(
        (c) =>
          activeCategories.includes(c.category as (typeof activeCategories)[number]) &&
          c.pipelines.length > 0
      )
      .map((c) => ({ category: c.category, items: c.pipelines as CompiledPipelineRow[] }));
  }, [pipelinesData?.byCategory, activeCategories]);

  // Check if any category has pipelines (ignoring active filter)
  const hasUnfilteredData = useMemo(() => {
    return pipelinesData?.byCategory.some((c) => c.pipelines.length > 0) ?? false;
  }, [pipelinesData?.byCategory]);

  // Check if any pipeline is in critical status
  const hasDocCriticalFailures = (pipelinesData?.summary.criticalPipelines ?? 0) > 0;

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
  const columns: Array<EuiBasicTableColumn<CompiledPipelineRow>> = useMemo(
    () => [
      {
        field: 'name',
        name: i18n.translate('xpack.securitySolution.siemReadiness.continuity.column.name', {
          defaultMessage: 'Pipeline Name',
        }),
        sortable: true,
        truncateText: true,
        width: statsAvailable ? '30%' : '70%',
      },
      ...(statsAvailable
        ? [
            {
              field: 'docsCount',
              name: i18n.translate(
                'xpack.securitySolution.siemReadiness.continuity.column.docsIngested',
                { defaultMessage: 'Docs Ingested' }
              ),
              sortable: true,
              render: (docsCount: number) => docsCount.toLocaleString(),
              width: '20%',
            } as EuiBasicTableColumn<CompiledPipelineRow>,
            {
              field: 'failedDocsCount',
              name: i18n.translate(
                'xpack.securitySolution.siemReadiness.continuity.column.failedDocs',
                { defaultMessage: 'Failed Docs' }
              ),
              sortable: true,
              render: (failedDocsCount: number) => failedDocsCount.toLocaleString(),
              width: '15%',
            } as EuiBasicTableColumn<CompiledPipelineRow>,
            {
              field: 'failureRate',
              name: i18n.translate(
                'xpack.securitySolution.siemReadiness.continuity.column.failureRate',
                { defaultMessage: 'Failure Rate' }
              ),
              sortable: true,
              render: (failureRate: string) => `${failureRate}%`,
              width: '15%',
            } as EuiBasicTableColumn<CompiledPipelineRow>,
            {
              field: 'failureRate',
              name: i18n.translate(
                'xpack.securitySolution.siemReadiness.continuity.column.status',
                { defaultMessage: 'Status' }
              ),
              render: (failureRate: string) => {
                const isCritical = isCriticalFailureRateFromString(failureRate);
                return (
                  <EuiBadge color={isCritical ? 'danger' : 'success'}>
                    {isCritical
                      ? i18n.translate(
                          'xpack.securitySolution.siemReadiness.continuity.status.criticalFailureRate',
                          { defaultMessage: 'Critical failure rate' }
                        )
                      : i18n.translate(
                          'xpack.securitySolution.siemReadiness.continuity.status.healthy',
                          { defaultMessage: 'Healthy' }
                        )}
                  </EuiBadge>
                );
              },
              width: '20%',
            } as EuiBasicTableColumn<CompiledPipelineRow>,
          ]
        : []),
      {
        field: 'name' as const,
        name: i18n.translate('xpack.securitySolution.siemReadiness.continuity.column.actions', {
          defaultMessage: 'Actions',
        }),
        actions: [
          {
            render: (item: CompiledPipelineRow) => (
              <EuiButtonEmpty
                size="s"
                href={getIngestPipelineUrl(basePath, item.name)}
                target="_blank"
              >
                {isCriticalFailureRateFromString(item.failureRate)
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
          },
        ],
      },
    ],
    [basePath, statsAvailable]
  );

  // Render function for accordion extra action (right side badges/stats)
  const renderExtraAction = (category: CategoryData<CompiledPipelineRow>) => {
    const totalPipelines = category.items.length;
    const totalDocs = category.items.reduce((sum, p) => sum + p.docsCount, 0);
    const totalFailed = category.items.reduce((sum, p) => sum + p.failedDocsCount, 0);
    const overallFailureRate = getFailureRateString(totalFailed, totalDocs);
    const isCritical = isCriticalFailureRateFromString(overallFailureRate);

    return (
      <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false}>
        {/* Status */}
        {statsAvailable && (
          <>
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
                      { defaultMessage: 'Actions required' }
                    )
                  : i18n.translate(
                      'xpack.securitySolution.siemReadiness.continuity.status.healthy',
                      { defaultMessage: 'Healthy' }
                    )}
              </EuiBadge>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiText size="xs" color="subdued">
                {'|'}
              </EuiText>
            </EuiFlexItem>
          </>
        )}
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
        {statsAvailable && (
          <>
            <EuiFlexItem grow={false}>
              <EuiText size="xs" color="subdued">
                {'|'}
              </EuiText>
            </EuiFlexItem>
            {/* Docs Ingested */}
            <EuiFlexItem grow={false}>
              <EuiText size="xs" color="subdued">
                {i18n.translate(
                  'xpack.securitySolution.siemReadiness.continuity.docsIngested.label',
                  { defaultMessage: 'Docs Ingested:' }
                )}
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
                {i18n.translate(
                  'xpack.securitySolution.siemReadiness.continuity.failureRate.label',
                  { defaultMessage: 'Failure Rate:' }
                )}
              </EuiText>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiBadge color="hollow">{`${overallFailureRate}%`}</EuiBadge>
            </EuiFlexItem>
          </>
        )}
      </EuiFlexGroup>
    );
  };

  const isLoading = pipelinesLoading;

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

  return (
    <>
      <EuiSpacer size="m" />
      {!statsAvailable && (
        <>
          <EuiCallOut
            announceOnMount
            title={i18n.translate(
              'xpack.securitySolution.siemReadiness.continuity.statsUnavailable.title',
              { defaultMessage: 'Ingestion stats not available' }
            )}
            color="warning"
            iconType="warning"
          >
            <p>
              {i18n.translate(
                'xpack.securitySolution.siemReadiness.continuity.statsUnavailable.body',
                {
                  defaultMessage:
                    'Pipeline ingestion stats (docs ingested, failed docs, failure rate) are not available in serverless mode. Pipelines are listed below for reference.',
                }
              )}
            </p>
          </EuiCallOut>
          <EuiSpacer size="m" />
        </>
      )}
      {statsAvailable && hasDocCriticalFailures && (
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
        {statsAvailable && hasDocCriticalFailures && (
          <>
            <EuiFlexItem grow={false}>
              <ViewCasesButton caseTagsArray={DATA_CONTINUITY_CASE_TAGS} />
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiButtonEmpty
                iconSide="right"
                size="s"
                iconType="plusCircle"
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
        storageKey={SIEM_READINESS_ACCORDIONS_STORAGE_KEY}
        isFilterActive={activeCategories.length < CATEGORY_ORDER.length && hasUnfilteredData}
        hasUnfilteredData={hasUnfilteredData}
      />
    </>
  );
};

ContinuityTab.displayName = 'ContinuityTab';
