/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useState, useEffect, useCallback } from 'react';
import type { TimeRange } from '@kbn/es-query';
import type { EsqlQueryResponse } from '../../common/esql';
import { callKubernetesPocApi } from '../services/rest/create_call_api';

interface UseEsqlQueryParams {
  query: string;
  timeRange?: TimeRange;
  enabled?: boolean;
}

interface UseEsqlQueryResult<T = Record<string, unknown>> {
  data: T[] | null;
  columns: EsqlQueryResponse['columns'] | null;
  loading: boolean;
  error: Error | null;
  refetch: () => void;
}

/**
 * Hook to execute ES|QL queries via the generic endpoint
 *
 * @param params.query - The ES|QL query string
 * @param params.timeRange - Optional time range for filtering
 * @param params.enabled - Whether to execute the query (default: true)
 * @returns Query result with rows, columns, loading state, and error
 */
export function useEsqlQuery<T = Record<string, unknown>>(
  params: UseEsqlQueryParams
): UseEsqlQueryResult<T> {
  const { query, timeRange, enabled = true } = params;
  const [data, setData] = useState<T[] | null>(null);
  const [columns, setColumns] = useState<EsqlQueryResponse['columns'] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const fetchData = useCallback(async () => {
    if (!enabled || !query) {
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await callKubernetesPocApi('POST /internal/kubernetes_poc/esql', {
        signal: null,
        params: {
          body: {
            query,
            ...(timeRange && {
              from: timeRange.from,
              to: timeRange.to,
            }),
          },
        },
      });

      const typedResponse = response as EsqlQueryResponse;
      setData(typedResponse.rows as T[]);
      setColumns(typedResponse.columns);
    } catch (e) {
      setError(e instanceof Error ? e : new Error('Failed to execute ES|QL query'));
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query, timeRange?.from, timeRange?.to, enabled]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return {
    data,
    columns,
    loading,
    error,
    refetch: fetchData,
  };
}
