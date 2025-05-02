/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { EuiDataGridSorting } from '@elastic/eui';
import { EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import React, { useEffect } from 'react';
import { usePerformanceContext } from '@kbn/ebt-tools';
import type { TopNFunctionSortField } from '@kbn/profiling-utils';
import { AsyncComponent } from '../../../components/async_component';
import { useProfilingDependencies } from '../../../components/contexts/profiling_dependencies/use_profiling_dependencies';
import { TopNFunctionsGrid } from '../../../components/topn_functions';
import { useProfilingParams } from '../../../hooks/use_profiling_params';
import { useProfilingRouter } from '../../../hooks/use_profiling_router';
import { useTimeRange } from '../../../hooks/use_time_range';
import { useTimeRangeAsync } from '../../../hooks/use_time_range_async';
import { AsyncStatus } from '../../../hooks/use_async';

export function TopNFunctionsView() {
  const { onPageReady } = usePerformanceContext();
  const { query } = useProfilingParams('/functions/topn');
  const { rangeFrom, rangeTo, kuery, sortDirection, sortField, pageIndex = 0 } = query;

  const timeRange = useTimeRange({ rangeFrom, rangeTo });

  const {
    services: { fetchTopNFunctions },
  } = useProfilingDependencies();

  const state = useTimeRangeAsync(
    ({ http }) => {
      return fetchTopNFunctions({
        http,
        timeFrom: new Date(timeRange.start).getTime(),
        timeTo: new Date(timeRange.end).getTime(),
        startIndex: 0,
        endIndex: 100000,
        kuery,
      });
    },
    [fetchTopNFunctions, timeRange.start, timeRange.end, kuery]
  );

  const profilingRouter = useProfilingRouter();

  function handleOnFrameClick(functionName: string) {
    profilingRouter.push('/flamegraphs/flamegraph', {
      path: {},
      query: { ...query, searchText: functionName },
    });
  }

  function handlePageChange(nextPage: number) {
    profilingRouter.push('/functions/topn', {
      path: {},
      query: { ...query, pageIndex: nextPage },
    });
  }

  function handleSortChange(sorting: EuiDataGridSorting['columns'][0]) {
    profilingRouter.push('/functions/topn', {
      path: {},
      query: {
        ...query,
        sortField: sorting.id as TopNFunctionSortField,
        sortDirection: sorting.direction,
      },
    });
  }
  useEffect(() => {
    if (state.status === AsyncStatus.Settled) {
      onPageReady({
        meta: {
          rangeFrom,
          rangeTo,
        },
        customMetrics: {
          key1: 'totalCount',
          value1: state.data?.TotalCount ?? 0,
        },
      });
    }
  }, [state.status, state.data, onPageReady, rangeFrom, rangeTo]);
  return (
    <>
      <EuiFlexGroup direction="column">
        <EuiFlexItem>
          <EuiFlexGroup direction="column" gutterSize="s">
            <EuiFlexItem>
              <AsyncComponent {...state} size="xl" alignTop>
                <TopNFunctionsGrid
                  topNFunctions={state.data}
                  totalSeconds={timeRange.inSeconds.end - timeRange.inSeconds.start}
                  isDifferentialView={false}
                  onFrameClick={handleOnFrameClick}
                  pageIndex={pageIndex}
                  onChangePage={handlePageChange}
                  sortField={sortField}
                  sortDirection={sortDirection}
                  onChangeSort={handleSortChange}
                />
              </AsyncComponent>
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlexItem>
      </EuiFlexGroup>
    </>
  );
}
