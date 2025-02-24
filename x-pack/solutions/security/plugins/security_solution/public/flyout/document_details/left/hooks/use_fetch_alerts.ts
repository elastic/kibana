/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import type { AggregationsAggregate, SearchResponse } from '@elastic/elasticsearch/lib/api/types';
import { isNumber } from 'lodash';
import { useKibana } from '../../../../common/lib/kibana';
import { type AlertsQueryParams, createFindAlerts } from '../services/find_alerts';

export type UseAlertsQueryParams = AlertsQueryParams;

export interface UseAlertsQueryResult {
  /**
   * Was there an error
   */
  error: boolean;
  /**
   * Is fetch in progress
   */
  loading: boolean;
  /**
   * Total records, for pagination
   */
  totalItemCount: number;
  /**
   * Individual records returned from running the query
   */
  data: SearchResponse<Record<string, unknown>>['hits']['hits'];
}

/**
 * Returns alerts based on provided ids with support for pagination. Uses react-query internally.
 */
export const useFetchAlerts = ({
  alertIds,
  from,
  size,
  sort,
}: UseAlertsQueryParams): UseAlertsQueryResult => {
  const QUERY_KEY = `useFetchAlerts`;

  const {
    services: { data: dataService },
  } = useKibana();

  const findAlerts = useMemo(() => createFindAlerts(dataService.search), [dataService.search]);

  const { data, isLoading, isError } = useQuery<
    SearchResponse<Record<string, unknown>, Record<string, AggregationsAggregate>>,
    unknown
  >(
    [QUERY_KEY, alertIds, from, size, sort],
    async ({ signal }) =>
      findAlerts({
        signal,
        alertIds,
        from,
        size,
        sort,
      }),
    {
      keepPreviousData: true,
    }
  );

  return useMemo(() => {
    const total = data?.hits?.total;

    return {
      loading: isLoading,
      error: isError,
      data: data?.hits?.hits || [],
      totalItemCount: isNumber(total) ? total : 0 || 0,
    };
  }, [data, isError, isLoading]);
};
