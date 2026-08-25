/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { capitalize } from 'lodash';
import type { AggregateQuery, TimeRange } from '@kbn/es-query';
import { getESQLResults } from '@kbn/esql-utils';
import { useKibana } from '../../../common/lib/kibana';
import { composeEsqlQuery, TIME_RANGE_ESQL_FILTER } from '../compose_esql_query';

export interface SeverityDatum {
  /** Severity keyword, e.g. "critical". Matches the shape the shared DonutChart expects. */
  key: string;
  /** Number of alerts (breached rule events) at this severity. */
  value: number;
  /** Display label, e.g. "Critical". */
  label: string;
}

/** Last ES|QL request/response, for the Inspect flyout. */
export interface EsqlInspect {
  request: object;
  response: object;
}

export interface UseSeverityDataResult {
  data: SeverityDatum[];
  isLoading: boolean;
  error: Error | null;
  /** The last ES|QL request + response, or null before the first successful run. */
  inspect: EsqlInspect | null;
}

/** Ordering used to sort the severity rows most-severe first. */
const SEVERITY_ORDER = ['critical', 'high', 'medium', 'low', 'info'];
const orderIndex = (key: string) => {
  const index = SEVERITY_ORDER.indexOf(key.toLowerCase());
  return index === -1 ? SEVERITY_ORDER.length : index;
};

/**
 * Builds the severity aggregation on top of the page's ES|QL query, so the chart
 * reflects exactly what the analyst typed in the search bar — including any
 * `LIMIT`. The time window (`?_tstart`/`?_tend`, filled from the time picker) and
 * the "is an alert" filter are injected right after the source command, before
 * the rest of the user's pipeline, so a user `LIMIT` caps the time-filtered
 * alerts rather than an arbitrary slice. Severity is only stamped on breached
 * events, so `severity IS NOT NULL` is the v2 analogue of the v1 terms agg on
 * `kibana.alert.severity`. The whole thing stays a single ES|QL statement.
 */
const buildSeverityQuery = (baseEsql: string): string =>
  composeEsqlQuery(
    baseEsql,
    [TIME_RANGE_ESQL_FILTER, 'WHERE severity IS NOT NULL'],
    ['STATS value = COUNT(*) BY severity']
  );

/**
 * Fetches the v2 severity distribution for the "Severity levels" KPI via ES|QL,
 * derived from the page's query and scoped to the given time range, shaped for
 * the shared DonutChart / table.
 */
export const useSeverityData = (
  query: AggregateQuery,
  timeRange: TimeRange
): UseSeverityDataResult => {
  const {
    services: { data },
  } = useKibana();

  const [state, setState] = useState<UseSeverityDataResult>({
    data: [],
    isLoading: false,
    error: null,
    inspect: null,
  });
  const abortRef = useRef<AbortController>();

  const run = useCallback(
    async (baseEsql: string, range: TimeRange) => {
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;
      setState((prev) => ({ ...prev, isLoading: true, error: null }));

      try {
        const { response, params } = await getESQLResults({
          esqlQuery: buildSeverityQuery(baseEsql),
          search: data.search.search,
          signal: controller.signal,
          timeRange: range,
        });
        if (controller.signal.aborted) {
          return;
        }
        const columns = response.columns.map((column) => column.name);
        const valueIndex = columns.indexOf('value');
        const severityIndex = columns.indexOf('severity');

        const rows: SeverityDatum[] = response.values
          .map((row) => {
            const key = String(row[severityIndex]);
            return { key, value: Number(row[valueIndex]) || 0, label: capitalize(key) };
          })
          .sort((a, b) => orderIndex(a.key) - orderIndex(b.key));

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
    run(query.esql, timeRange);
  }, [run, query, timeRange]);

  return state;
};
