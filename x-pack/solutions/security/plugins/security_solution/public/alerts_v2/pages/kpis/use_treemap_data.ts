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

export interface TreemapDatum {
  group0: string;
  /** Present only when a secondary grouping field is selected. */
  group1: string | null;
  value: number;
}

export interface UseTreemapDataResult {
  data: TreemapDatum[];
  isLoading: boolean;
  error: Error | null;
  inspect: EsqlInspect | null;
}

const RESULT_LIMIT = 100;
const NONE_LABEL = '(none)';

const stripJsonQuotes = (value: string): string => value.replace(/^"|"$/g, '');
const coerce = (value: unknown): string =>
  value == null ? NONE_LABEL : stripJsonQuotes(String(value));

// Two-level (or one-level) grouping sized by episode count. v1's treemap also
// carries a max risk-score sub-agg for coloring, but v2 rule events have no risk
// score (documented gap), so we size by count only.
const buildTreemapQuery = (baseEsql: string, field0: string, field1: string): string => {
  const stats = field1
    ? `STATS value = COUNT(*) BY group0 = ${fieldToEsqlExpr(field0)}, group1 = ${fieldToEsqlExpr(
        field1
      )}`
    : `STATS value = COUNT(*) BY group0 = ${fieldToEsqlExpr(field0)}`;
  return composeEsqlQuery(
    baseEsql,
    [TIME_RANGE_ESQL_FILTER],
    [stats, 'SORT value DESC', `LIMIT ${RESULT_LIMIT}`]
  );
};

/**
 * Fetches the v2 "Treemap" data (episode counts grouped by one or two fields) for
 * the KPI section via ES|QL, derived from the page's query and scoped to the
 * given time range.
 */
export const useTreemapData = (
  query: AggregateQuery,
  timeRange: TimeRange,
  field0: string,
  field1: string
): UseTreemapDataResult => {
  const {
    services: { data },
  } = useKibana();

  const [state, setState] = useState<UseTreemapDataResult>({
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
          esqlQuery: buildTreemapQuery(baseEsql, groupBy0, groupBy1),
          search: data.search.search,
          signal: controller.signal,
          timeRange: range,
        });
        if (controller.signal.aborted) {
          return;
        }
        const columns = response.columns.map((column) => column.name);
        const valueIndex = columns.indexOf('value');
        const group0Index = columns.indexOf('group0');
        const group1Index = columns.indexOf('group1');

        const rows: TreemapDatum[] = response.values.map((row) => ({
          group0: coerce(row[group0Index]),
          group1: group1Index >= 0 ? coerce(row[group1Index]) : null,
          value: Number(row[valueIndex]) || 0,
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
