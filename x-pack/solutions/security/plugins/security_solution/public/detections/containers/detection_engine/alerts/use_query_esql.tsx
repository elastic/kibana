/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isEmpty } from 'lodash';
import type { Dispatch, SetStateAction } from 'react';
import { useMemo, useEffect, useState } from 'react';
import type { ESQLSearchResponse } from '@kbn/es-types';
import type { GroupingAggregation } from '@kbn/grouping';
import { fetchQueryUnifiedAlertsEsql } from './api';
import type { QueryEsqlAlerts } from './types';
import { useTrackHttpRequest } from '../../../../common/lib/apm/use_track_http_request';
import type { ALERTS_QUERY_NAMES } from './constants';
import { transformEsqlToGroupingAggregation } from '../../../components/alerts_table/grouping_settings/esql_transformer';
import type { AlertsGroupingAggregation } from '../../../components/alerts_table/grouping_settings/types';

type Func = () => Promise<void>;

export interface ReturnQueryAlertsEsql<T> {
  loading: boolean;
  data: GroupingAggregation<T> | null;
  setQuery: Dispatch<SetStateAction<string | undefined>>;
  response: string;
  request: string;
  refetch: Func | null;
}

export type AlertsQueryName = (typeof ALERTS_QUERY_NAMES)[keyof typeof ALERTS_QUERY_NAMES];

export interface AlertsEsqlQueryParams {
  query?: string;
  skip?: boolean;
  /**
   * The query name is used for performance monitoring with APM
   */
  queryName: AlertsQueryName;
}

/**
 * Wrapped fetch method that integrates
 * http-request monitoring using APM transactions.
 */
const useTrackedFetchEsqlMethod = (queryName: string) => {
  const { startTracking } = useTrackHttpRequest();

  const monitoredFetchMethod = useMemo(() => {
    return async (params: QueryEsqlAlerts): Promise<ESQLSearchResponse> => {
      const { endTracking } = startTracking({ name: queryName });
      let result: ESQLSearchResponse;
      try {
        result = await fetchQueryUnifiedAlertsEsql(params);
        endTracking('success');
      } catch (err) {
        endTracking(params.signal.aborted ? 'aborted' : 'error');
        throw err;
      }
      return result;
    };
  }, [queryName, startTracking]);

  return monitoredFetchMethod;
};

/**
 * Hook for fetching Alerts using ES|QL queries from the Detection Engine API
 *
 * @param query ES|QL query string (all filters should be included in the query)
 * @param skip Whether to skip the query
 * @param queryName The query name for performance monitoring
 *
 */
export const useQueryAlertsEsql = <T = AlertsGroupingAggregation,>({
  query: initialQuery,
  skip,
  queryName,
}: AlertsEsqlQueryParams): ReturnQueryAlertsEsql<T> => {
  const [query, setQuery] = useState<string | undefined>(initialQuery);
  const [alerts, setAlerts] = useState<
    Pick<ReturnQueryAlertsEsql<T>, 'data' | 'setQuery' | 'response' | 'request' | 'refetch'>
  >({
    data: null,
    response: '',
    request: '',
    setQuery,
    refetch: null,
  });
  const [loading, setLoading] = useState(false);

  const fetchAlerts = useTrackedFetchEsqlMethod(queryName);

  useEffect(() => {
    let isSubscribed = true;
    const abortCtrl = new AbortController();

    const fetchData = async () => {
      if (!query) {
        return;
      }

      try {
        setLoading(true);

        const esqlResponse = await fetchAlerts({
          query,
          signal: abortCtrl.signal,
        });

        if (isSubscribed) {
          const transformed = transformEsqlToGroupingAggregation(
            esqlResponse
          ) as GroupingAggregation<T>;
          setAlerts({
            data: transformed,
            response: JSON.stringify(esqlResponse, null, 2),
            request: JSON.stringify({ query }, null, 2),
            setQuery,
            refetch: fetchData,
          });
        }
      } catch (error) {
        if (isSubscribed) {
          setAlerts({
            data: null,
            response: '',
            request: '',
            setQuery,
            refetch: fetchData,
          });
        }
      }
      if (isSubscribed) {
        setLoading(false);
      }
    };

    if (!isEmpty(query) && !skip) {
      fetchData();
    }
    if (skip || !query) {
      setLoading(false);
      isSubscribed = false;
      abortCtrl.abort();
    }

    return () => {
      isSubscribed = false;
      abortCtrl.abort();
    };
  }, [query, skip, fetchAlerts]);

  return { loading, ...alerts };
};
