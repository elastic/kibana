/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';
import { useQuery } from '@kbn/react-query';
import type { AggregationsAggregate, SearchResponse } from '@elastic/elasticsearch/lib/api/types';
import { isNumber } from 'lodash';
import { useKibana } from '../../../../../common/lib/kibana';
import { useAlertsPrivileges } from '../../../../../detections/containers/detection_engine/alerts/use_alerts_privileges';
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
  index,
}: UseAlertsQueryParams): UseAlertsQueryResult => {
  const QUERY_KEY = `useFetchAlerts`;

  const {
    services: { data: dataService },
  } = useKibana();
  const { hasAlertsRead } = useAlertsPrivileges();

  const findAlerts = useMemo(() => createFindAlerts(dataService.search), [dataService.search]);

  const isEnabled = useMemo(
    () => hasAlertsRead && (alertIds?.length ?? 0) > 0,
    [alertIds, hasAlertsRead]
  );

  const { data, isLoading, isError } = useQuery<
    SearchResponse<Record<string, unknown>, Record<string, AggregationsAggregate>>,
    unknown
  >(
    [QUERY_KEY, alertIds, from, size, sort, index],
    async ({ signal }) =>
      findAlerts({
        signal,
        alertIds,
        from,
        size,
        sort,
        index,
      }),
    {
      keepPreviousData: true,
      enabled: isEnabled,
    }
  );

  return useMemo(() => {
    // When disabled (e.g. alertIds became empty after a date range change), react-query keeps
    // returning the last cached `data` (because of `keepPreviousData`) even though no query ran
    // for the current alertIds. Explicitly clear the result in that case so stale alerts don't
    // linger in the table.
    if (!isEnabled) {
      return {
        loading: false,
        error: false,
        data: [],
        totalItemCount: 0,
      };
    }

    const total = data?.hits?.total;

    return {
      loading: isLoading,
      error: isError,
      data: data?.hits?.hits || [],
      totalItemCount: isNumber(total) ? total : 0 || 0,
    };
  }, [data, isEnabled, isError, isLoading]);
};
