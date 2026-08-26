/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import type { AggregateQuery, TimeRange } from '@kbn/es-query';
import type { DataView } from '@kbn/data-views-plugin/common';
import type { DataTableRecord } from '@kbn/discover-utils';
import { getESQLResults, getESQLAdHocDataview } from '@kbn/esql-utils';
import { useKibana } from '../../../common/lib/kibana';
import { composeEsqlQuery, TIME_RANGE_ESQL_FILTER } from '../compose_esql_query';
import type { EsqlInspect } from '../kpis/esql_inspect_button';

/** One ES|QL result column, `{ name, type }`, as returned by the _query response. */
export interface EsqlColumn {
  name: string;
  type: string;
}

export interface UseEpisodesTableDataResult {
  /** Episode rows shaped for UnifiedDataTable (cell renderers read `row.flattened[field]`). */
  rows: DataTableRecord[];
  /** Raw ES|QL result columns — used to build `columnsMeta` for the grid (next step). */
  columns: EsqlColumn[];
  /** Ad-hoc DataView derived from the query (container for the grid; columns come from ES|QL). */
  dataView: DataView | undefined;
  isLoading: boolean;
  error: Error | null;
  inspect: EsqlInspect | null;
}

const PAGE_SIZE = 100;

// The episodes list is the page's query (the `$.alert-episodes` view), time-scoped
// and capped. Unlike the KPIs there's no aggregation — we want the episode rows.
const buildEpisodesTableQuery = (baseEsql: string): string =>
  composeEsqlQuery(baseEsql, [TIME_RANGE_ESQL_FILTER], [`LIMIT ${PAGE_SIZE}`]);

const INITIAL_STATE: UseEpisodesTableDataResult = {
  rows: [],
  columns: [],
  dataView: undefined,
  isLoading: false,
  error: null,
  inspect: null,
};

/**
 * Fetches episode rows for the table via the page's ES|QL query (bar-driven,
 * over `$.alert-episodes`), and builds the ad-hoc DataView the grid needs. Maps
 * the flat ES|QL result into `DataTableRecord[]` so the RnA cell renderers can
 * read fields off `row.flattened`.
 */
export const useEpisodesTableData = (
  query: AggregateQuery,
  timeRange: TimeRange
): UseEpisodesTableDataResult => {
  const {
    services: { data, dataViews, http },
  } = useKibana();

  const [state, setState] = useState<UseEpisodesTableDataResult>(INITIAL_STATE);
  const abortRef = useRef<AbortController>();

  const run = useCallback(
    async (baseEsql: string, range: TimeRange) => {
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;
      setState((prev) => ({ ...prev, isLoading: true, error: null }));

      try {
        const [{ response, params }, dataView] = await Promise.all([
          getESQLResults({
            esqlQuery: buildEpisodesTableQuery(baseEsql),
            search: data.search.search,
            signal: controller.signal,
            timeRange: range,
          }),
          getESQLAdHocDataview({ query: baseEsql, dataViewsService: dataViews, http }),
        ]);
        if (controller.signal.aborted) {
          return;
        }

        const columns: EsqlColumn[] = response.columns.map((column) => ({
          name: column.name,
          type: String(column.type),
        }));
        const columnNames = columns.map((column) => column.name);

        const rows: DataTableRecord[] = response.values.map((row, index) => {
          const record: Record<string, unknown> = {};
          columnNames.forEach((name, columnIndex) => {
            record[name] = row[columnIndex];
          });
          const id = (record['episode.id'] as string | undefined) ?? String(index);
          return { id, raw: { _id: id, _source: record }, flattened: record };
        });

        setState({
          rows,
          columns,
          dataView,
          isLoading: false,
          error: null,
          inspect: { request: params, response },
        });
      } catch (error) {
        if (controller.signal.aborted) {
          return;
        }
        setState({ ...INITIAL_STATE, error: error as Error });
      }
    },
    [data, dataViews, http]
  );

  useEffect(() => {
    run(query.esql, timeRange);
  }, [run, query, timeRange]);

  return state;
};
