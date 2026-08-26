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

export interface TopValueDatum {
  label: string;
  value: number;
}

export interface UseTopAlertsByDataResult {
  data: TopValueDatum[];
  isLoading: boolean;
  error: Error | null;
  inspect: EsqlInspect | null;
}

const TOP_N = 10;

/**
 * Groups episodes by an entity field and returns the top N by count. The entity
 * fields (host.name, user.name, …) live as flat, dotted keys inside the episode's
 * `flattened` `data`. `JSON_EXTRACT` rejects a `flattened` field directly, so we
 * cast it to `keyword` first (`data::keyword` yields the JSON string), and use
 * JSONPath *bracket* notation (`$['host.name']`) because the key literally
 * contains a dot — `$.host.name` would look for a nested object and return
 * nothing. This keeps the whole thing a single ES|QL statement over the view.
 * (`FIELD_EXTRACT(data, "host.name")` is a faster alternative but is 9.5+ tech
 * preview; `data::keyword` works everywhere.)
 *
 * `field` comes from a fixed allowlist in the panel, so it's safe to interpolate.
 */
const buildTopAlertsByQuery = (baseEsql: string, field: string): string =>
  composeEsqlQuery(
    baseEsql,
    [TIME_RANGE_ESQL_FILTER],
    [
      `EVAL entity = JSON_EXTRACT(data::keyword, "$['${field}']")`,
      'WHERE entity IS NOT NULL',
      'STATS value = COUNT(*) BY entity',
      'SORT value DESC',
      `LIMIT ${TOP_N}`,
    ]
  );

const stripJsonQuotes = (value: string): string => value.replace(/^"|"$/g, '');

/**
 * Fetches the "top alerts by <field>" distribution for the Summary tab via ES|QL,
 * derived from the page's query and scoped to the given time range.
 */
export const useTopAlertsByData = (
  query: AggregateQuery,
  timeRange: TimeRange,
  field: string
): UseTopAlertsByDataResult => {
  const {
    services: { data },
  } = useKibana();

  const [state, setState] = useState<UseTopAlertsByDataResult>({
    data: [],
    isLoading: false,
    error: null,
    inspect: null,
  });
  const abortRef = useRef<AbortController>();

  const run = useCallback(
    async (baseEsql: string, range: TimeRange, groupByField: string) => {
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;
      setState((prev) => ({ ...prev, isLoading: true, error: null }));

      try {
        const { response, params } = await getESQLResults({
          esqlQuery: buildTopAlertsByQuery(baseEsql, groupByField),
          search: data.search.search,
          signal: controller.signal,
          timeRange: range,
        });
        if (controller.signal.aborted) {
          return;
        }
        const columns = response.columns.map((column) => column.name);
        const valueIndex = columns.indexOf('value');
        const entityIndex = columns.indexOf('entity');

        const rows: TopValueDatum[] = response.values.map((row) => ({
          label: stripJsonQuotes(String(row[entityIndex])),
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
    run(query.esql, timeRange, field);
  }, [run, query, timeRange, field]);

  return state;
};
