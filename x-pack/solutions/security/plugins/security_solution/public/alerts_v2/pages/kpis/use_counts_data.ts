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
import type { EsqlInspect } from './esql_inspect_button';
import { fieldToEsqlExpr } from './episode_fields';

export interface CountsDatum {
  col0: string;
  /** Present only when a secondary breakdown field is selected. */
  col1: string | null;
  count: number;
}

export interface UseCountsDataResult {
  data: CountsDatum[];
  isLoading: boolean;
  error: Error | null;
  inspect: EsqlInspect | null;
}

const RESULT_LIMIT = 100;

const stripJsonQuotes = (value: string): string => value.replace(/^"|"$/g, '');

// Counts table: group episodes by one field (and optionally a second) and count.
// Mirrors the v1 counts panel's stackByField0 / stackByField1.
const buildCountsQuery = (baseEsql: string, field0: string, field1: string): string => {
  const stats = field1
    ? `STATS count = COUNT(*) BY col0 = ${fieldToEsqlExpr(field0)}, col1 = ${fieldToEsqlExpr(field1)}`
    : `STATS count = COUNT(*) BY col0 = ${fieldToEsqlExpr(field0)}`;
  return composeEsqlQuery(
    baseEsql,
    [TIME_RANGE_ESQL_FILTER],
    [stats, 'SORT count DESC', `LIMIT ${RESULT_LIMIT}`]
  );
};

/**
 * Fetches the v2 "Counts" table for the KPI section via ES|QL, derived from the
 * page's query and scoped to the given time range. `field1` is optional ('' =
 * single-level count).
 */
export const useCountsData = (
  query: AggregateQuery,
  timeRange: TimeRange,
  field0: string,
  field1: string
): UseCountsDataResult => {
  const {
    services: { data },
  } = useKibana();

  const [state, setState] = useState<UseCountsDataResult>({
    data: [],
    isLoading: false,
    error: null,
    inspect: null,
  });
  const abortRef = useRef<AbortController>();

  const run = useCallback(
    async (baseEsql: string, range: TimeRange, groupBy0: string, groupBy1: string) => {
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;
      setState((prev) => ({ ...prev, isLoading: true, error: null }));

      try {
        const { response, params } = await getESQLResults({
          esqlQuery: buildCountsQuery(baseEsql, groupBy0, groupBy1),
          search: data.search.search,
          signal: controller.signal,
          timeRange: range,
        });
        if (controller.signal.aborted) {
          return;
        }
        const columns = response.columns.map((column) => column.name);
        const countIndex = columns.indexOf('count');
        const col0Index = columns.indexOf('col0');
        const col1Index = columns.indexOf('col1');

        const rows: CountsDatum[] = response.values.map((row) => ({
          col0: stripJsonQuotes(String(row[col0Index])),
          col1: col1Index >= 0 ? stripJsonQuotes(String(row[col1Index])) : null,
          count: Number(row[countIndex]) || 0,
        }));

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
    run(query.esql, timeRange, field0, field1);
  }, [run, query, timeRange, field0, field1]);

  return state;
};
