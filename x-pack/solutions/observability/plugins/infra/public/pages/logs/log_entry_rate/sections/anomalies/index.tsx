/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiEmptyPrompt,
  EuiFlexGroup,
  EuiFlexItem,
  EuiSpacer,
  EuiLoadingSpinner,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React from 'react';
import { TimeRange } from '../../../../../../common/time/time_range';
import { AnomaliesSwimlaneVisualisation } from './anomalies_swimlane_visualisation';
import { AnomaliesTable } from './table';
import {
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
import { AutoRefresh } from '../../use_log_entry_rate_results_url_state';

export const AnomaliesResults: React.FunctionComponent<{
  isLoadingAnomaliesResults: boolean;
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
        {!anomalies || anomalies.length === 0 ? (
          <LoadingOverlayWrapper
            isLoading={isLoadingAnomaliesResults}
            loadingChildren={<LoadingOverlayContent />}
          >
            <EuiEmptyPrompt
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

const loadingAriaLabel = i18n.translate(
  'xpack.infra.logs.analysis.anomaliesSectionLoadingAriaLabel',
  { defaultMessage: 'Loading anomalies' }
);

const LoadingOverlayContent = () => <EuiLoadingSpinner size="xl" aria-label={loadingAriaLabel} />;
