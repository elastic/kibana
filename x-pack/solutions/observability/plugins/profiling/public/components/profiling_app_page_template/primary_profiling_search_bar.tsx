/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect } from 'react';
import { useProfilingParams } from '../../hooks/use_profiling_params';
import { useProfilingRouter } from '../../hooks/use_profiling_router';
import { useProfilingRoutePath } from '../../hooks/use_profiling_route_path';
import { useTimeRangeContext } from '../../hooks/use_time_range_context';
import { useProfilingDependencies } from '../contexts/profiling_dependencies/use_profiling_dependencies';
import { ProfilingSearchBar } from './profiling_search_bar';

export function PrimaryProfilingSearchBar({ showSubmitButton }: { showSubmitButton?: boolean }) {
  const {
    start: { data },
  } = useProfilingDependencies();

  const profilingRouter = useProfilingRouter();
  const routePath = useProfilingRoutePath();

  const { path, query } = useProfilingParams('/*');

  if (!('rangeFrom' in query)) {
    throw new Error('Range query parameters are missing');
  }

  const { rangeFrom, rangeTo, kuery } = query;

  const { refresh } = useTimeRangeContext();

  useEffect(() => {
    // set time if both to and from are given in the url
    if (rangeFrom && rangeTo) {
      data.query.timefilter.timefilter.setTime({
        from: rangeFrom,
        to: rangeTo,
      });
      return;
    }
  }, [rangeFrom, rangeTo, data]);

  return (
    <ProfilingSearchBar
      kuery={kuery}
      rangeFrom={rangeFrom}
      rangeTo={rangeTo}
      onQuerySubmit={(next) => {
        profilingRouter.push(routePath, {
          path,
          query: {
            ...query,
            kuery: String(next.query?.query || ''),
            rangeFrom: next.dateRange.from,
            rangeTo: next.dateRange.to,
          },
        });
      }}
      onRefresh={(nextDateRange) => {
        profilingRouter.push(routePath, {
          path,
          query: {
            ...query,
            rangeFrom: nextDateRange.dateRange.from,
            rangeTo: nextDateRange.dateRange.to,
          },
        });
      }}
      onRefreshClick={() => {
        refresh();
      }}
      showSubmitButton={showSubmitButton}
    />
  );
}
