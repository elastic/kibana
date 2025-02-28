/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { useEffect } from 'react';
import { usePerformanceContext } from '@kbn/ebt-tools';
import { groupSamplesByCategory } from '../../../common/topn';
import { useProfilingDependencies } from '../../components/contexts/profiling_dependencies/use_profiling_dependencies';
import { ProfilingAppPageTemplate } from '../../components/profiling_app_page_template';
import { StackTraces } from '../../components/stack_traces';
import { useProfilingParams } from '../../hooks/use_profiling_params';
import { useProfilingRouter } from '../../hooks/use_profiling_router';
import { useProfilingRoutePath } from '../../hooks/use_profiling_route_path';
import { useTimeRange } from '../../hooks/use_time_range';
import { useTimeRangeAsync } from '../../hooks/use_time_range_async';
import { RouteBreadcrumb } from '../../routing/route_breadcrumb';
import { getStackTracesTabs } from './get_stack_traces_tabs';
import { getTracesViewRouteParams } from './utils';
import { AsyncStatus } from '../../hooks/use_async';

export function StackTracesView() {
  const routePath = useProfilingRoutePath();

  const profilingRouter = useProfilingRouter();

  const {
    path,
    query,
    path: { topNType },
    query: { rangeFrom, rangeTo, kuery, displayAs, limit: limitFromQueryParams },
  } = useProfilingParams('/stacktraces/{topNType}');

  const limit = limitFromQueryParams || 10;

  const tabs = getStackTracesTabs({
    path,
    query,
    profilingRouter,
  });
  const selectedTab = tabs.find((tab) => tab.isSelected);

  const {
    services: { fetchTopN },
  } = useProfilingDependencies();

  const timeRange = useTimeRange({
    rangeFrom,
    rangeTo,
  });

  const state = useTimeRangeAsync(
    ({ http }) => {
      if (!topNType) {
        return Promise.resolve({ charts: [], metadata: {} });
      }
      return fetchTopN({
        http,
        type: topNType,
        timeFrom: timeRange.inSeconds.start,
        timeTo: timeRange.inSeconds.end,
        kuery,
      }).then(groupSamplesByCategory);
    },
    [topNType, timeRange.inSeconds.start, timeRange.inSeconds.end, fetchTopN, kuery]
  );

  function onChartClick(category: string) {
    profilingRouter.push(
      '/stacktraces/{topNType}',
      getTracesViewRouteParams({ query, topNType: path.topNType, category })
    );
  }

  const { onPageReady } = usePerformanceContext();

  useEffect(() => {
    if (state.status === AsyncStatus.Settled) {
      onPageReady({
        meta: {
          rangeFrom,
          rangeTo,
        },
        customMetrics: {
          key1: 'totalCount',
          value1: state.data?.charts.length ?? 0,
        },
      });
    }
  }, [state.status, state.data?.charts.length, onPageReady, rangeFrom, rangeTo]);
  return (
    <RouteBreadcrumb title={selectedTab?.label || ''} href={selectedTab?.href || ''}>
      <ProfilingAppPageTemplate tabs={tabs}>
        <StackTraces
          type={topNType}
          state={state}
          displayOption={displayAs}
          limit={limit}
          onChartClick={onChartClick}
          onChangeDisplayOption={(nextValue) => {
            profilingRouter.push(routePath, {
              path,
              query: {
                ...query,
                displayAs: nextValue,
              },
            });
          }}
          onStackedBarChartBrushEnd={(nextRange) => {
            profilingRouter.push(routePath, {
              path,
              query: {
                ...query,
                rangeFrom: nextRange.rangeFrom,
                rangeTo: nextRange.rangeTo,
              },
            });
          }}
          onShowMoreClick={() => {
            profilingRouter.push(routePath, {
              path,
              query: {
                ...query,
                limit: limit + 10,
              },
            });
          }}
        />
      </ProfilingAppPageTemplate>
    </RouteBreadcrumb>
  );
}
