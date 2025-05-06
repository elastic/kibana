/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { EuiFlexGroup, EuiFlexItem, EuiHorizontalRule, EuiPanel, EuiSpacer } from '@elastic/eui';
import React, { useEffect } from 'react';
import { usePerformanceContext } from '@kbn/ebt-tools';
import { AsyncComponent } from '../../../components/async_component';
import { useProfilingDependencies } from '../../../components/contexts/profiling_dependencies/use_profiling_dependencies';
import { FramesSummary } from '../../../components/frames_summary';
import type { OnChangeSortParams } from '../../../components/differential_topn_functions_grid';
import { DifferentialTopNFunctionsGrid } from '../../../components/differential_topn_functions_grid';
import type { NormalizationOptions } from '../../../components/normalization_menu';
import { NormalizationMenu, NormalizationMode } from '../../../components/normalization_menu';
import { PrimaryAndComparisonSearchBar } from '../../../components/primary_and_comparison_search_bar';
import { AsyncStatus } from '../../../hooks/use_async';
import { useProfilingParams } from '../../../hooks/use_profiling_params';
import { useProfilingRouter } from '../../../hooks/use_profiling_router';
import { useProfilingRoutePath } from '../../../hooks/use_profiling_route_path';
import { useTimeRange } from '../../../hooks/use_time_range';
import { useTimeRangeAsync } from '../../../hooks/use_time_range_async';

export function DifferentialTopNFunctionsView() {
  const { onPageReady } = usePerformanceContext();
  const { query } = useProfilingParams('/functions/differential');
  const {
    rangeFrom,
    rangeTo,
    kuery,
    sortDirection,
    sortField,
    comparisonKuery,
    normalizationMode,
    comparisonRangeFrom,
    comparisonRangeTo,
    baseline = 1,
    comparison = 1,
    pageIndex = 0,
    comparisonSortDirection,
    comparisonSortField,
  } = query;

  const timeRange = useTimeRange({ rangeFrom, rangeTo });
  const comparisonTimeRange = useTimeRange({
    rangeFrom: comparisonRangeFrom,
    rangeTo: comparisonRangeTo,
    optional: true,
  });

  const totalSeconds = timeRange.inSeconds.end - timeRange.inSeconds.start;
  const totalComparisonSeconds =
    comparisonTimeRange.inSeconds.end! - comparisonTimeRange.inSeconds.start!;

  const comparisonTime = totalSeconds / totalComparisonSeconds;

  const baselineTime = 1;
  const normalizationOptions: NormalizationOptions = {
    baselineScale: baseline,
    baselineTime,
    comparisonScale: comparison,
    comparisonTime,
  };

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

  const comparisonState = useTimeRangeAsync(
    ({ http }) => {
      if (!comparisonTimeRange.start || !comparisonTimeRange.end) {
        return undefined;
      }
      return fetchTopNFunctions({
        http,
        timeFrom: new Date(comparisonTimeRange.start).getTime(),
        timeTo: new Date(comparisonTimeRange.end).getTime(),
        startIndex: 0,
        endIndex: 100000,
        kuery: comparisonKuery,
      });
    },
    [comparisonTimeRange.start, comparisonTimeRange.end, fetchTopNFunctions, comparisonKuery]
  );

  const routePath = useProfilingRoutePath() as
    | '/functions'
    | '/functions/topn'
    | '/functions/differential';

  const profilingRouter = useProfilingRouter();

  function onChangeNormalizationMode(
    nextNormalizationMode: NormalizationMode,
    options: NormalizationOptions
  ) {
    profilingRouter.push(routePath, {
      path: routePath,
      query:
        nextNormalizationMode === NormalizationMode.Scale
          ? {
              ...query,
              baseline: options.baselineScale,
              comparison: options.comparisonScale,
              normalizationMode: nextNormalizationMode,
            }
          : {
              ...query,
              normalizationMode: nextNormalizationMode,
            },
    });
  }

  const isNormalizedByTime = normalizationMode === NormalizationMode.Time;

  function handleOnFrameClick(functionName: string) {
    profilingRouter.push('/flamegraphs/flamegraph', {
      path: {},
      query: { ...query, searchText: functionName },
    });
  }

  function handlePageChange(nextPage: number) {
    profilingRouter.push('/functions/differential', {
      path: {},
      query: { ...query, pageIndex: nextPage },
    });
  }

  function handleOnSort(sorting: OnChangeSortParams) {
    profilingRouter.push('/functions/differential', {
      path: {},
      query: { ...query, ...sorting },
    });
  }

  useEffect(() => {
    if (state.status === AsyncStatus.Settled || comparisonState.status === AsyncStatus.Settled) {
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
  }, [
    state.status,
    state.data?.TotalCount,
    comparisonState.status,
    onPageReady,
    rangeTo,
    rangeFrom,
  ]);

  return (
    <>
      <EuiFlexGroup direction="column">
        <EuiFlexItem grow={false}>
          <EuiPanel hasShadow={false} color="subdued">
            <PrimaryAndComparisonSearchBar />
            <EuiHorizontalRule />
            <NormalizationMenu
              mode={normalizationMode}
              options={normalizationOptions}
              onChange={onChangeNormalizationMode}
            />
            <EuiSpacer />
            <FramesSummary
              isLoading={
                state.status === AsyncStatus.Loading ||
                comparisonState.status === AsyncStatus.Loading
              }
              baseValue={
                state.data
                  ? {
                      totalCount: state.data.selfCPU,
                      scaleFactor: isNormalizedByTime ? baselineTime : baseline,
                      totalAnnualCO2Kgs: state.data.totalAnnualCO2Kgs,
                      totalAnnualCostUSD: state.data.totalAnnualCostUSD,
                    }
                  : undefined
              }
              comparisonValue={
                comparisonState.data
                  ? {
                      totalCount: comparisonState.data.selfCPU,
                      scaleFactor: isNormalizedByTime ? comparisonTime : comparison,
                      totalAnnualCO2Kgs: comparisonState.data.totalAnnualCO2Kgs,
                      totalAnnualCostUSD: comparisonState.data.totalAnnualCostUSD,
                    }
                  : undefined
              }
            />
          </EuiPanel>
        </EuiFlexItem>
        <EuiFlexItem>
          <AsyncComponent
            {...(comparisonState.status === AsyncStatus.Loading ? comparisonState : state)}
            size="xl"
            alignTop
          >
            <DifferentialTopNFunctionsGrid
              base={state.data}
              baselineScaleFactor={isNormalizedByTime ? comparisonTime : comparison}
              comparison={comparisonState.data}
              comparisonScaleFactor={isNormalizedByTime ? baselineTime : baseline}
              comparisonSortDirection={comparisonSortDirection}
              comparisonSortField={comparisonSortField}
              comparisonTotalSeconds={totalComparisonSeconds}
              onChangePage={handlePageChange}
              onChangeSort={handleOnSort}
              onFrameClick={handleOnFrameClick}
              pageIndex={pageIndex}
              sortDirection={sortDirection}
              sortField={sortField}
              totalSeconds={totalSeconds}
            />
          </AsyncComponent>
        </EuiFlexItem>
      </EuiFlexGroup>
    </>
  );
}
