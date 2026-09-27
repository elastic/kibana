/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import type { AggregateQuery, TimeRange } from '@kbn/es-query';
import { getESQLResults } from '@kbn/esql-utils';
import { useKibana } from '../../../common/lib/kibana';
import { composeEsqlQuery, TIME_RANGE_ESQL_FILTER } from '../compose_esql_query';
import { fieldToEsqlExpr } from './episode_fields';
import type { EsqlInspect } from './esql_inspect_button';

export interface TrendDatum {
  /** Bucket start, in epoch milliseconds (for the time x-axis). */
  timestamp: number;
  /** The "stack by" field value this bucket count belongs to. */
  series: string;
  value: number;
}

export interface UseTrendDataResult {
  data: TrendDatum[];
  isLoading: boolean;
  error: Error | null;
  inspect: EsqlInspect | null;
}

/** Target number of buckets; ES|QL BUCKET picks a human-friendly interval for the range. */
const TARGET_BUCKETS = 50;

const stripJsonQuotes = (value: string): string => value.replace(/^"|"$/g, '');

// Date histogram of episodes over time, split by a "stack by" field — the ES|QL
// equivalent of the v1 stacked histogram (rendered via Lens in v1). BUCKET with a
// target count + the ?_tstart/?_tend range auto-selects a sensible interval.
const buildTrendQuery = (baseEsql: string, field: string): string =>
  composeEsqlQuery(
    baseEsql,
    [TIME_RANGE_ESQL_FILTER],
    [
      `STATS value = COUNT(*) BY bucket = BUCKET(@timestamp, ${TARGET_BUCKETS}, ?_tstart, ?_tend), series = ${fieldToEsqlExpr(
        field
      )}`,
      'SORT bucket ASC',
    ]
  );

/**
 * Fetches the v2 "Trend" histogram (episodes over time, stacked by `field`) for
 * the KPI section via ES|QL, derived from the page's query and scoped to the
 * given time range.
 */
export const useTrendData = (
  query: AggregateQuery,
  timeRange: TimeRange,
  field: string
): UseTrendDataResult => {
  const {
    services: { data },
  } = useKibana();

  const [state, setState] = useState<UseTrendDataResult>({
    data: [],
    isLoading: false,
    error: null,
    inspect: null,
  });
  const abortRef = useRef<AbortController>();

  const run = useCallback(
    async (baseEsql: string, range: TimeRange, stackByField: string) => {
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;
      setState((prev) => ({ ...prev, isLoading: true, error: null }));

      try {
        const { response, params } = await getESQLResults({
          esqlQuery: buildTrendQuery(baseEsql, stackByField),
          search: data.search.search,
          signal: controller.signal,
          timeRange: range,
        });
        if (controller.signal.aborted) {
          return;
        }
        const columns = response.columns.map((column) => column.name);
        const valueIndex = columns.indexOf('value');
        const bucketIndex = columns.indexOf('bucket');
        const seriesIndex = columns.indexOf('series');

        const rows: TrendDatum[] = response.values
          .map((row) => ({
            timestamp: new Date(String(row[bucketIndex])).getTime(),
            series: stripJsonQuotes(String(row[seriesIndex])),
            value: Number(row[valueIndex]) || 0,
          }))
          .filter((datum) => !Number.isNaN(datum.timestamp));

        setState({
          data: rows,
          isLoading: false,
          error: null,
          inspect: { request: params, response },
        });
      } catch (error) {
        if (controller.signal.aborted) {
          return;
        }
        setState({ data: [], isLoading: false, error: error as Error, inspect: null });
      }
    },
    [data]
  );

  useEffect(() => {
    run(query.esql, timeRange, field);
  }, [run, query, timeRange, field]);

  return state;
};
