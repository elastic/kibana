/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isEmpty } from 'lodash';
import { useMemo, useEffect, useState } from 'react';
import type { SetStateAction } from 'react';
import type React from 'react';
import type { fetchQueryRuleRegistryAlerts } from './api';
import { fetchQueryAlerts } from './api';
import type { AlertSearchResponse, QueryAlerts } from './types';
import { useTrackHttpRequest } from '../../../../common/lib/apm/use_track_http_request';
import type { ALERTS_QUERY_NAMES } from './constants';

type Func = () => Promise<void>;

export interface ReturnQueryAlerts<Hit, Aggs> {
  loading: boolean;
  data: AlertSearchResponse<Hit, Aggs> | null;
  setQuery: React.Dispatch<SetStateAction<object>>;
  response: string;
  request: string;
  refetch: Func | null;
}

type AlertsQueryName = (typeof ALERTS_QUERY_NAMES)[keyof typeof ALERTS_QUERY_NAMES];

type FetchMethod = typeof fetchQueryAlerts | typeof fetchQueryRuleRegistryAlerts;
export interface AlertsQueryParams {
  fetchMethod?: FetchMethod;
  query: object;
  indexName?: string | null;
  skip?: boolean;
  /**
   * The query name is used for performance monitoring with APM
   */
  queryName: AlertsQueryName;
}

/**
 * Wrapped `fetchMethod` hook that integrates
 * http-request monitoring using APM transactions.
 */
const useTrackedFetchMethod = (fetchMethod: FetchMethod, queryName: string): FetchMethod => {
  const { startTracking } = useTrackHttpRequest();

  const monitoredFetchMethod = useMemo<FetchMethod>(() => {
    return async <Hit, Aggs>(params: QueryAlerts) => {
      const { endTracking } = startTracking({ name: queryName });
      let result: AlertSearchResponse<Hit, Aggs>;
      try {
        result = await fetchMethod<Hit, Aggs>(params);
        endTracking('success');
      } catch (err) {
        endTracking(params.signal.aborted ? 'aborted' : 'error');
        throw err;
      }
      return result;
    };
  }, [fetchMethod, queryName, startTracking]);

  return monitoredFetchMethod;
};

/**
 * Hook for fetching Alerts from the Detection Engine API
 *
 * @param initialQuery query dsl object
 *
 */
export const useQueryAlerts = <Hit, Aggs>({
  fetchMethod = fetchQueryAlerts,
  query: initialQuery,
  indexName,
  skip,
  queryName,
}: AlertsQueryParams): ReturnQueryAlerts<Hit, Aggs> => {
  const [query, setQuery] = useState(initialQuery);
  const [alerts, setAlerts] = useState<
    Pick<ReturnQueryAlerts<Hit, Aggs>, 'data' | 'setQuery' | 'response' | 'request' | 'refetch'>
  >({
    data: null,
    response: '',
    request: '',
    setQuery,
    refetch: null,
  });
  const [loading, setLoading] = useState(false);

  const fetchAlerts = useTrackedFetchMethod(fetchMethod, queryName);

  useEffect(() => {
    let isSubscribed = true;
    const abortCtrl = new AbortController();

    const fetchData = async () => {
      try {
        setLoading(true);

        const alertResponse = await fetchAlerts<Hit, Aggs>({
          query,
          signal: abortCtrl.signal,
        });

        if (isSubscribed) {
          setAlerts({
            data: alertResponse,
            response: JSON.stringify(alertResponse, null, 2),
            request: JSON.stringify({ index: [indexName] ?? [''], body: query }, null, 2),
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
    if (skip) {
      setLoading(false);
      isSubscribed = false;
      abortCtrl.abort();
    }

    return () => {
      isSubscribed = false;
      abortCtrl.abort();
    };
  }, [query, indexName, skip, fetchAlerts]);

  return { loading, ...alerts };
};
