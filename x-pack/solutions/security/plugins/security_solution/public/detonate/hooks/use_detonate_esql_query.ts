/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';
import { getESQLResults } from '@kbn/esql-utils';
import { useQuery } from '@kbn/react-query';
import type { TimeRange } from '@kbn/es-query';

import { esqlResponseToRecords } from '../../common/utils/esql';
import { useKibana } from '../../common/lib/kibana';

export interface DetonateEsqlQueryResult<T> {
  records: T[];
  isLoading: boolean;
  isError: boolean;
  error: unknown;
  refetch: () => void;
}

/**
 * Runs a Detonate ES|QL query against the tasks index.
 *
 * The tasks index is not a security data view, so the global KQL bar and filter pills are
 * deliberately not applied; the time range is passed as `?_tstart` / `?_tend` named parameters
 * instead, which the query resolves against the index's own `timestamp` field.
 */
export const useDetonateEsqlQuery = <T extends Record<string, unknown>>({
  query,
  timeRange,
  queryKey,
  enabled = true,
}: {
  query: string | null;
  timeRange?: TimeRange;
  queryKey: string;
  enabled?: boolean;
}): DetonateEsqlQueryResult<T> => {
  const { data } = useKibana().services;

  const {
    isLoading,
    isError,
    error,
    data: result,
    refetch,
  } = useQuery(
    ['detonate', queryKey, query, timeRange?.from, timeRange?.to],
    async ({ signal }) => {
      if (!query) {
        return null;
      }

      return getESQLResults({
        esqlQuery: query,
        search: data.search.search,
        signal,
        timeRange,
      });
    },
    {
      enabled: enabled && query != null,
      refetchOnWindowFocus: false,
      keepPreviousData: true,
    }
  );

  const records = useMemo(
    () => esqlResponseToRecords<T>(result?.response ?? undefined),
    [result?.response]
  );

  return { records, isLoading, isError, error, refetch };
};
