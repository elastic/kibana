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

export interface AlertsByRuleDatum {
  /**
   * The rule identifier. v2 rule events carry only `rule.id` (a saved-object
   * UUID) — there is no rule name on the alert, so this is the UUID until we
   * resolve names via a rule lookup.
   */
  rule: string;
  /** Number of episodes for this rule. */
  value: number;
}

export interface UseAlertsByRuleDataResult {
  data: AlertsByRuleDatum[];
  isLoading: boolean;
  error: Error | null;
  inspect: EsqlInspect | null;
}

// Group episodes by rule and count, on top of the page's query. Mirrors the v1
// terms agg on `kibana.alert.rule.name`, but v2 only has `rule.id`.
const buildAlertsByRuleQuery = (baseEsql: string): string =>
  composeEsqlQuery(
    baseEsql,
    [TIME_RANGE_ESQL_FILTER],
    ['STATS value = COUNT(*) BY rule = `rule.id`', 'SORT value DESC']
  );

/**
 * Fetches the v2 "alerts by rule" distribution for the Summary tab via ES|QL,
 * derived from the page's query and scoped to the given time range.
 */
export const useAlertsByRuleData = (
  query: AggregateQuery,
  timeRange: TimeRange
): UseAlertsByRuleDataResult => {
  const {
    services: { data },
  } = useKibana();

  const [state, setState] = useState<UseAlertsByRuleDataResult>({
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
          esqlQuery: buildAlertsByRuleQuery(baseEsql),
          search: data.search.search,
          signal: controller.signal,
          timeRange: range,
        });
        if (controller.signal.aborted) {
          return;
        }
        const columns = response.columns.map((column) => column.name);
        const valueIndex = columns.indexOf('value');
        const ruleIndex = columns.indexOf('rule');

        const rows: AlertsByRuleDatum[] = response.values.map((row) => ({
          rule: String(row[ruleIndex]),
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
    run(query.esql, timeRange);
  }, [run, query, timeRange]);

  return state;
};
