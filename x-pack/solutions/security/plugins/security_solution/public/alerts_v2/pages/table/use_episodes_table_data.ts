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
import { getESQLResults, getESQLAdHocDataview, formatESQLColumns } from '@kbn/esql-utils';
import { getTextBasedColumnsMeta, type SortOrder } from '@kbn/unified-data-table';
import { useKibana } from '../../../common/lib/kibana';
import { composeEsqlQuery, TIME_RANGE_ESQL_FILTER } from '../compose_esql_query';
import type { EsqlInspect } from '../kpis/esql_inspect_button';

type ColumnsMeta = ReturnType<typeof getTextBasedColumnsMeta>;

export interface UseEpisodesTableDataResult {
  /** Episode rows shaped for UnifiedDataTable (cell renderers read `row.flattened[field]`). */
  rows: DataTableRecord[];
  /** Column type metadata for the grid, derived from the ES|QL result columns. */
  columnsMeta: ColumnsMeta;
  /** Ad-hoc DataView derived from the query (container for the grid; columns come from ES|QL). */
  dataView: DataView | undefined;
  isLoading: boolean;
  error: Error | null;
  inspect: EsqlInspect | null;
  /** Re-runs the current query — used to refresh after an episode action mutates `.alert-actions`. */
  refetch: () => void;
}

/** Internal fetch state (everything the hook returns except the imperative `refetch`). */
type TableDataState = Omit<UseEpisodesTableDataResult, 'refetch'>;

const PAGE_SIZE = 100;

/**
 * ECS source-event columns the v1 alerts table shows by default. In v2 they live
 * inside the flattened `data`, so we extract them into same-named columns (the
 * `data::keyword` + JSON_EXTRACT route, same as the KPIs).
 */
export const ECS_DATA_COLUMNS = [
  'host.name',
  'user.name',
  'process.name',
  'file.name',
  'source.ip',
  'destination.ip',
];

const stripJsonQuotes = (value: string): string => value.replace(/^"|"$/g, '');

/** Server-side sort: `SORT` runs after the EVAL, so any column (incl. extracted ones) is sortable. */
const buildSortClause = (sort: SortOrder[]): string[] => {
  if (!sort.length) {
    return [];
  }
  const clause = sort
    .map(([field, direction]) => `\`${field}\` ${String(direction).toUpperCase()}`)
    .join(', ');
  return [`SORT ${clause}`];
};

// The episodes list is the page's query (the `$.alert-episodes` view), time-scoped
// and capped. Unlike the KPIs there's no aggregation — we want the episode rows,
// plus the ECS columns pulled out of `data`. The whole row is handed to the document
// flyout as-is, so we don't need the rule-event doc id/index.
const buildEpisodesTableQuery = (baseEsql: string, sort: SortOrder[]): string => {
  const evalExpr = ECS_DATA_COLUMNS.map(
    (field) => `\`${field}\` = JSON_EXTRACT(data::keyword, "$['${field}']")`
  ).join(', ');
  return composeEsqlQuery(
    baseEsql,
    [TIME_RANGE_ESQL_FILTER],
    [`EVAL ${evalExpr}`, ...buildSortClause(sort), `LIMIT ${PAGE_SIZE}`]
  );
};

const INITIAL_STATE: TableDataState = {
  rows: [],
  columnsMeta: {},
  dataView: undefined,
  isLoading: false,
  error: null,
  inspect: null,
};

/**
 * Fetches episode rows for the table via the page's ES|QL query (bar-driven,
 * over `$.alert-episodes`), and builds the ad-hoc DataView + column metadata the
 * grid needs. Maps the flat ES|QL result into `DataTableRecord[]` so the RnA cell
 * renderers can read fields off `row.flattened`.
 */
export const useEpisodesTableData = (
  query: AggregateQuery,
  timeRange: TimeRange,
  sort: SortOrder[]
): UseEpisodesTableDataResult => {
  const {
    services: { data, dataViews, http },
  } = useKibana();

  const [state, setState] = useState<TableDataState>(INITIAL_STATE);
  const abortRef = useRef<AbortController>();

  const run = useCallback(
    async (baseEsql: string, range: TimeRange, sortState: SortOrder[]) => {
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;
      setState((prev) => ({ ...prev, isLoading: true, error: null }));

      try {
        const [{ response, params }, dataView] = await Promise.all([
          getESQLResults({
            esqlQuery: buildEpisodesTableQuery(baseEsql, sortState),
            search: data.search.search,
            signal: controller.signal,
            timeRange: range,
          }),
          getESQLAdHocDataview({ query: baseEsql, dataViewsService: dataViews, http }),
        ]);
        if (controller.signal.aborted) {
          return;
        }

        const datatableColumns = formatESQLColumns(response.columns);
        const columnsMeta = getTextBasedColumnsMeta(datatableColumns);
        const columnNames = response.columns.map((column) => column.name);

        const rows: DataTableRecord[] = response.values.map((row, index) => {
          const record: Record<string, unknown> = {};
          columnNames.forEach((name, columnIndex) => {
            record[name] = row[columnIndex];
          });
          // Extracted `data` values come back as JSON strings — unquote for display.
          ECS_DATA_COLUMNS.forEach((column) => {
            const value = record[column];
            if (typeof value === 'string') {
              record[column] = stripJsonQuotes(value);
            }
          });
          const id = (record['episode.id'] as string | undefined) ?? String(index);
          return { id, raw: { _id: id, _source: record }, flattened: record };
        });

        setState({
          rows,
          columnsMeta,
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
    run(query.esql, timeRange, sort);
  }, [run, query, timeRange, sort]);

  const refetch = useCallback(() => {
    run(query.esql, timeRange, sort);
  }, [run, query, timeRange, sort]);

  return { ...state, refetch };
};
