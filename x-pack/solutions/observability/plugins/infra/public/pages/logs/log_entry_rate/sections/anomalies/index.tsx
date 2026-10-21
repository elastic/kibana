/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiButton,
  EuiEmptyPrompt,
  EuiFlexGroup,
  EuiFlexItem,
  EuiSpacer,
  EuiLoadingSpinner,
} from '@elastic/eui';
import { getEbtProps } from '@kbn/ebt-click';
import { i18n } from '@kbn/i18n';
import React from 'react';
import type { TimeRange } from '../../../../../../common/time/time_range';
import { INFRA_EBT_ACTIONS, INFRA_EBT_ELEMENTS } from '../../../../../common/ebt_constants';
import { AnomaliesSwimlaneVisualisation } from './anomalies_swimlane_visualisation';
import { AnomaliesTable } from './table';
import type {
  ChangePaginationOptions,
  ChangeSortOptions,
  FetchNextPage,
  FetchPreviousPage,
  LogEntryAnomalies,
  Page,
  PaginationOptions,
  SortOptions,
} from '../../use_log_entry_anomalies_results';
import { LoadingOverlayWrapper } from '../../../../../components/loading_overlay_wrapper';
import type { AutoRefresh } from '../../use_log_entry_rate_results_url_state';

export const AnomaliesResults: React.FunctionComponent<{
  isLoadingAnomaliesResults: boolean;
  hasFailedLoadingAnomaliesResults: boolean;
  onRetryAnomaliesResults: () => void;
  anomalies: LogEntryAnomalies;
  timeRange: TimeRange;
  page: Page;
  fetchNextPage?: FetchNextPage;
  fetchPreviousPage?: FetchPreviousPage;
  changeSortOptions: ChangeSortOptions;
  changePaginationOptions: ChangePaginationOptions;
  sortOptions: SortOptions;
  paginationOptions: PaginationOptions;
  selectedDatasets: string[];
  jobIds: string[];
  autoRefresh: AutoRefresh;
}> = ({
  isLoadingAnomaliesResults,
  hasFailedLoadingAnomaliesResults,
  onRetryAnomaliesResults,
  timeRange,
  anomalies,
  changeSortOptions,
  sortOptions,
  changePaginationOptions,
  paginationOptions,
  fetchNextPage,
  fetchPreviousPage,
  page,
  selectedDatasets,
  jobIds,
  autoRefresh,
}) => {
  return (
    <>
      <EuiFlexGroup>
        <EuiFlexItem>
          <AnomaliesSwimlaneVisualisation
            jobIds={jobIds}
            timeRange={timeRange}
            selectedDatasets={selectedDatasets}
            autoRefresh={autoRefresh}
          />
        </EuiFlexItem>
      </EuiFlexGroup>
      <EuiSpacer size="l" />
      <>
        {hasFailedLoadingAnomaliesResults ? (
          <AnomaliesResultsFailurePrompt onRetry={onRetryAnomaliesResults} />
        ) : !anomalies || anomalies.length === 0 ? (
          <LoadingOverlayWrapper
            isLoading={isLoadingAnomaliesResults}
            loadingChildren={<LoadingOverlayContent />}
          >
            <EuiEmptyPrompt
              data-test-subj="infraAnomaliesNoDataPrompt"
              title={
                <h2>
                  {i18n.translate('xpack.infra.logs.analysis.anomalySectionNoDataTitle', {
                    defaultMessage: 'There is no data to display.',
                  })}
                </h2>
              }
              titleSize="m"
              body={
                <p>
                  {i18n.translate('xpack.infra.logs.analysis.anomalySectionNoDataBody', {
                    defaultMessage: 'You may want to adjust your time range.',
                  })}
                </p>
              }
            />
          </LoadingOverlayWrapper>
        ) : (
          <AnomaliesTable
            results={anomalies}
            timeRange={timeRange}
            changeSortOptions={changeSortOptions}
            changePaginationOptions={changePaginationOptions}
            sortOptions={sortOptions}
            paginationOptions={paginationOptions}
            fetchNextPage={fetchNextPage}
            fetchPreviousPage={fetchPreviousPage}
            page={page}
            isLoading={isLoadingAnomaliesResults}
          />
        )}
      </>
    </>
  );
};

const AnomaliesResultsFailurePrompt: React.FunctionComponent<{ onRetry: () => void }> = ({
  onRetry,
}) => (
  <EuiEmptyPrompt
    data-test-subj="infraAnomaliesFailurePrompt"
    color="danger"
    iconType="warning"
    title={<h2>{anomalySectionLoadingFailureTitle}</h2>}
    titleSize="m"
    body={<p>{anomalySectionLoadingFailureBody}</p>}
    actions={
      <EuiButton
        data-test-subj="infraAnomaliesFailurePromptRetryButton"
        color="danger"
        fill
        onClick={onRetry}
        {...getEbtProps({
          action: INFRA_EBT_ACTIONS.RETRY_LOAD,
          element: INFRA_EBT_ELEMENTS.LOG_ANALYSIS_ANOMALIES_RESULTS,
        })}
      >
        {anomalySectionLoadingFailureRetryButtonLabel}
      </EuiButton>
    }
  />
);

const anomalySectionLoadingFailureTitle = i18n.translate(
  'xpack.infra.logs.analysis.anomalySectionLoadingFailureTitle',
  { defaultMessage: 'Failed to load anomalies' }
);

const anomalySectionLoadingFailureBody = i18n.translate(
  'xpack.infra.logs.analysis.anomalySectionLoadingFailureBody',
  { defaultMessage: 'Try again or adjust your time range.' }
);

const anomalySectionLoadingFailureRetryButtonLabel = i18n.translate(
  'xpack.infra.logs.analysis.anomalySectionLoadingFailureRetryButtonLabel',
  { defaultMessage: 'Retry' }
);

const loadingAriaLabel = i18n.translate(
  'xpack.infra.logs.analysis.anomaliesSectionLoadingAriaLabel',
  { defaultMessage: 'Loading anomalies' }
);

const LoadingOverlayContent = () => <EuiLoadingSpinner size="xl" aria-label={loadingAriaLabel} />;
