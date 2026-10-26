/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isEmpty } from 'lodash';
import type { Dispatch, SetStateAction } from 'react';
import { useMemo, useEffect, useState, useRef } from 'react';
import type { KibanaExecutionContext } from '@kbn/core-execution-context-common';
import type {
  fetchQueryAttacks,
  fetchQueryUnifiedAlerts,
  fetchQueryRuleRegistryAlerts,
} from './api';
import { fetchQueryAlerts } from './api';
import type { AlertSearchResponse, QueryAlerts } from './types';
import { useTrackHttpRequest } from '../../../../common/lib/apm/use_track_http_request';
import type { ALERTS_QUERY_NAMES } from './constants';

type Func = () => Promise<void>;

export interface ReturnQueryAlerts<Hit, Aggs> {
  loading: boolean;
  data: AlertSearchResponse<Hit, Aggs> | null;
  setQuery: Dispatch<SetStateAction<object>>;
  response: string;
  request: string;
  refetch: Func | null;
}

export type AlertsQueryName = (typeof ALERTS_QUERY_NAMES)[keyof typeof ALERTS_QUERY_NAMES];

type FetchMethod =
  | typeof fetchQueryAlerts
  | typeof fetchQueryRuleRegistryAlerts
  | typeof fetchQueryUnifiedAlerts
  | typeof fetchQueryAttacks;
export interface AlertsQueryParams {
  fetchMethod?: FetchMethod;
  query: object;
  indexName?: string | null;
  skip?: boolean;
  /**
   * The query name is used for performance monitoring with APM
   */
  queryName: AlertsQueryName;
  /**
   * Optional Kibana execution context forwarded to `http.fetch` (surfaced as `x-opaque-id` in ES
   * slow logs and as APM trace labels) so the alert query can be attributed to the calling
   * page/panel.
   */
  executionContext?: KibanaExecutionContext;
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
  executionContext,
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

  // Hold the latest executionContext in a ref so re-renders that pass a fresh
  // literal (e.g. `executionContext: buildExecutionContext(...)` inline) don't
  // change the effect dependency identity, which would abort the in-flight
  // request and re-fetch on every render — an unbounded loop when the effect's
  // own setState updates feed back into the same render cycle. The values here
  // are pure trace labels; reading them at invocation time (not close-over
  // time) is functionally equivalent.
  const executionContextRef = useRef(executionContext);
  executionContextRef.current = executionContext;

  useEffect(() => {
    let isSubscribed = true;
    const abortCtrl = new AbortController();

    const fetchData = async () => {
      try {
        setLoading(true);

        const alertResponse = await fetchAlerts<Hit, Aggs>({
          query,
          signal: abortCtrl.signal,
          context: executionContextRef.current,
        });

        if (isSubscribed) {
          setAlerts({
            data: alertResponse,
            response: JSON.stringify(alertResponse, null, 2),
            request: JSON.stringify(
              { index: indexName ? [indexName] : [''], body: query },
              null,
              2
            ),
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
