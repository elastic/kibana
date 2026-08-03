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
  EuiLoadingSpinner,
  EuiTitle,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { decodeOrThrow } from '@kbn/io-ts-utils';
import { getFieldByType } from '@kbn/metrics-data-access-plugin/common';
import React, { useCallback, useMemo, useState } from 'react';
import { ProcessListAPIResponseRT } from '../../../../../common/http_api';
import { useSourceContext } from '../../../../containers/metrics_source';
import { isPending, useFetcher } from '../../../../hooks/use_fetcher';
import { ProcessesExplanationMessage } from '../../components/processes_explanation';
import { TopProcessesTooltip } from '../../components/top_processes_tooltip';
import { useAssetDetailsRenderPropsContext } from '../../hooks/use_asset_details_render_props';
import { useAssetDetailsUrlState } from '../../hooks/use_asset_details_url_state';
import { useDatePickerContext } from '../../hooks/use_date_picker';
import { ProcessListContextProvider, type SortBy } from '../../hooks/use_process_list';
import { useRequestObservable } from '../../hooks/use_request_observable';
import { useTabSwitcherContext } from '../../hooks/use_tab_switcher';
import { parseSearchString } from './parse_search_string';
import { ProcessesTable } from './processes_table';
import { SummaryTable } from './summary_table';

const PROCESSES_LIMIT = 10;

export const Processes = () => {
  const { getDateRangeInTimestamp } = useDatePickerContext();
  const [urlState, setUrlState] = useAssetDetailsUrlState();
  const { entity, schema } = useAssetDetailsRenderPropsContext();
  const { sourceId } = useSourceContext();
  const { request$ } = useRequestObservable();
  const { isActiveTab } = useTabSwitcherContext();

  const searchText = urlState?.processSearch ?? '';

  const toTimestamp = useMemo(() => getDateRangeInTimestamp().to, [getDateRangeInTimestamp]);

  const [sortBy, setSortBy] = useState<SortBy>({
    name: 'cpu',
    isAscending: false,
  });

  const hostTerm = useMemo(() => {
    const field = getFieldByType(entity.type) ?? entity.type;
    return { [field]: entity.name };
  }, [entity.name, entity.type]);

  const { searchFilter, searchQueryError } = useMemo(() => {
    try {
      return { searchFilter: parseSearchString(searchText), searchQueryError: undefined };
    } catch (e) {
      return { searchFilter: [{ match_all: {} }], searchQueryError: (e as Error).message };
    }
  }, [searchText]);
  const parsedSortBy = useMemo(
    () =>
      sortBy.name === 'runtimeLength'
        ? {
            ...sortBy,
            name: 'startTime',
          }
        : sortBy,
    [sortBy]
  );

  const { data, status, error, refetch } = useFetcher(
    async (callApi) => {
      const response = await callApi('/api/metrics/process_list', {
        method: 'POST',
        body: JSON.stringify({
          hostTerm,
          sourceId,
          to: toTimestamp,
          sortBy: parsedSortBy,
          searchFilter,
          schema,
        }),
      });

      return decodeOrThrow(ProcessListAPIResponseRT)(response);
    },
    [hostTerm, parsedSortBy, searchFilter, sourceId, toTimestamp, schema],
    {
      requestObservable$: request$,
      autoFetch: isActiveTab('processes'),
    }
  );

  const clearSearchBar = useCallback(() => {
    setUrlState({ processSearch: '' });
  }, [setUrlState]);

  const isLoading = isPending(status);

  const hideSummaryTable = schema === 'semconv';

  return (
    <ProcessListContextProvider hostTerm={hostTerm} to={toTimestamp}>
      <EuiFlexGroup direction="column" gutterSize="m">
        {!hideSummaryTable && (
          <EuiFlexItem grow={false}>
            <SummaryTable
              isLoading={isLoading}
              processSummary={error || !data?.summary ? { total: 0 } : data?.summary}
            />
          </EuiFlexItem>
        )}
        <EuiFlexGroup direction="column" gutterSize="xs">
          <EuiFlexGroup gutterSize="xs" alignItems="center">
            <EuiFlexItem grow={false}>
              <EuiTitle data-test-subj="infraAssetDetailsTopProcessesTitle" size="xxs">
                <span>
                  <FormattedMessage
                    id="xpack.infra.metrics.nodeDetails.processesHeader"
                    defaultMessage="Top {count} processes"
                    values={{
                      count: data?.processList.length || PROCESSES_LIMIT,
                    }}
                  />
                </span>
              </EuiTitle>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <TopProcessesTooltip />
            </EuiFlexItem>
          </EuiFlexGroup>
          {!error && (
            <EuiFlexGroup alignItems="flexStart">
              <EuiFlexItem>
                {isLoading ? (
                  <EuiLoadingSpinner />
                ) : (
                  (data?.processList ?? []).length > 0 && <ProcessesExplanationMessage />
                )}
              </EuiFlexItem>
            </EuiFlexGroup>
          )}
        </EuiFlexGroup>
        <EuiFlexItem grow={false}>
          {!error ? (
            <ProcessesTable
              currentTime={toTimestamp}
              isLoading={isLoading}
              processList={data?.processList ?? []}
              sortBy={sortBy}
              error={searchQueryError}
              setSortBy={setSortBy}
              clearSearchBar={clearSearchBar}
              schema={schema}
            />
          ) : (
            <EuiEmptyPrompt
              iconType="warning"
              title={
                <h4>
                  <FormattedMessage
                    id="xpack.infra.metrics.nodeDetails.processListError"
                    defaultMessage="Unable to load process data"
                  />
                </h4>
              }
              actions={
                <EuiButton
                  data-test-subj="infraAssetDetailsTabComponentTryAgainButton"
                  color="primary"
                  fill
                  onClick={refetch}
                >
                  <FormattedMessage
                    id="xpack.infra.metrics.nodeDetails.processListRetry"
                    defaultMessage="Try again"
                  />
                </EuiButton>
              }
            />
          )}
        </EuiFlexItem>
      </EuiFlexGroup>
    </ProcessListContextProvider>
  );
};
