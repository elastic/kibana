/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import React, { useEffect } from 'react';
import { SchemaSelector } from '../schema_selector';
import { useProfilingParams } from '../../hooks/use_profiling_params';
import { useProfilingRouter } from '../../hooks/use_profiling_router';
import { useProfilingRoutePath } from '../../hooks/use_profiling_route_path';
import { useTimeRangeContext } from '../../hooks/use_time_range_context';
import { useProfilingDependencies } from '../contexts/profiling_dependencies/use_profiling_dependencies';
import { useProfilingSetupStatus } from '../contexts/profiling_setup_status/use_profiling_setup_status';
import { ProfilingSearchBar } from './profiling_search_bar';

export function PrimaryProfilingSearchBar({
  showSubmitButton,
  hideSchemaSelector = false,
}: {
  showSubmitButton?: boolean;
  hideSchemaSelector?: boolean;
}) {
  const {
    start: { data },
  } = useProfilingDependencies();

  const { profilingSetupStatus } = useProfilingSetupStatus();
  const isServerless = profilingSetupStatus?.type === 'serverless';

  const profilingRouter = useProfilingRouter();
  const routePath = useProfilingRoutePath();

  const { path, query } = useProfilingParams('/*');

  if (!('rangeFrom' in query)) {
    throw new Error('Range query parameters are missing');
  }

  const { rangeFrom, rangeTo, kuery, schema } = query;

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
    <EuiFlexGroup gutterSize="s" alignItems="center" wrap={false}>
      <EuiFlexItem>
        <ProfilingSearchBar
          kuery={kuery}
          rangeFrom={rangeFrom}
          rangeTo={rangeTo}
          schema={schema}
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
      </EuiFlexItem>
      {!isServerless && !hideSchemaSelector && (
        <EuiFlexItem grow={false}>
          <SchemaSelector
            value={schema}
            onChange={(nextSchema) => {
              profilingRouter.push(routePath, { path, query: { ...query, schema: nextSchema } });
            }}
          />
        </EuiFlexItem>
      )}
    </EuiFlexGroup>
  );
}
