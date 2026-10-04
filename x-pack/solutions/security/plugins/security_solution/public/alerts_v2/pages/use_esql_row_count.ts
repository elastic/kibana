/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import type { AggregateQuery, TimeRange } from '@kbn/es-query';
import { getESQLResults } from '@kbn/esql-utils';
import { useKibana } from '../../common/lib/kibana';
import { composeEsqlQuery, TIME_RANGE_ESQL_FILTER } from './compose_esql_query';

export interface UseEsqlRowCountResult {
  count: number | null;
  isLoading: boolean;
  error: Error | null;
}

/**
 * Debug readout: runs the page's raw ES|QL query, time-filtered exactly like the
 * charts, and returns how many rows it yields (`STATS COUNT(*)`, so it's exact
 * regardless of size). Used to compare against Discover and against each chart —
 * a chart that shows fewer is filtering/aggregating on top of this baseline.
 */
export const useEsqlRowCount = (
  query: AggregateQuery,
  timeRange: TimeRange
): UseEsqlRowCountResult => {
  const {
    services: { data },
  } = useKibana();

  const [state, setState] = useState<UseEsqlRowCountResult>({
    count: null,
    isLoading: false,
    error: null,
  });
  const abortRef = useRef<AbortController>();

  const run = useCallback(
    async (baseEsql: string, range: TimeRange) => {
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;
      setState((prev) => ({ ...prev, isLoading: true, error: null }));

      try {
        const esqlQuery = composeEsqlQuery(
          baseEsql,
          [TIME_RANGE_ESQL_FILTER],
          ['STATS __count = COUNT(*)']
        );
        const { response } = await getESQLResults({
          esqlQuery,
          search: data.search.search,
          signal: controller.signal,
          timeRange: range,
        });
        if (controller.signal.aborted) {
          return;
        }
        const count = response.values.length ? Number(response.values[0][0]) : 0;
        setState({ count, isLoading: false, error: null });
      } catch (error) {
        if (controller.signal.aborted) {
          return;
        }
        setState({ count: null, isLoading: false, error: error as Error });
      }
    },
    [data]
  );

  useEffect(() => {
    run(query.esql, timeRange);
  }, [run, query, timeRange]);

  return state;
};
