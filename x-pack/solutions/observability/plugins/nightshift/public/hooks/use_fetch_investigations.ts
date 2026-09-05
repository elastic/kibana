/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useQuery, type UseQueryResult } from '@kbn/react-query';
import type {
  ListInvestigationsResponse,
  Severity,
} from '@kbn/nightshift-investigations-plugin/common';
import { isHttpClientError } from '../common/http_error';
import { useKibana } from './use_kibana';

export const NIGHTSHIFT_INVESTIGATIONS_QUERY_KEY = ['nightshift.investigations'] as const;

const ACTIVE_INVESTIGATIONS_REFETCH_INTERVAL_MS = 5_000;

export interface FetchInvestigationsParams {
  page?: number;
  size: number;
  query?: string;
  severities?: Severity[];
}

export const useFetchInvestigations = ({
  page = 1,
  size,
  query,
  severities,
}: FetchInvestigationsParams): UseQueryResult<ListInvestigationsResponse, Error> => {
  const investigationsClient = useKibana().services.nightshiftInvestigations?.investigationsClient;

  return useQuery<ListInvestigationsResponse, Error>({
    queryKey: [...NIGHTSHIFT_INVESTIGATIONS_QUERY_KEY, page, size, query, severities],
    // investigationsClient is undefined when the plugin is unavailable (optional dep)
    enabled: investigationsClient != null,
    queryFn: async ({ signal }) => {
      if (!investigationsClient) {
        // enabled guards this at runtime; TS cannot see that from inside the closure
        throw new Error('Nightshift investigations plugin is unavailable');
      }
      return investigationsClient.fetch('GET /internal/nightshift/investigations', {
        params: {
          query: {
            sort_field: 'created_at',
            sort_order: 'desc',
            page,
            size,
            ...(query ? { query } : {}),
            ...(severities?.length ? { severities } : {}),
          },
        },
        signal: signal ?? null,
      });
    },
    refetchInterval: (data) =>
      data?.results.some(({ status }) => status === 'pending' || status === 'running')
        ? ACTIVE_INVESTIGATIONS_REFETCH_INTERVAL_MS
        : false,
    keepPreviousData: true,
    // Deviates from the app's convention of not setting `retry`. Without this, an
    // unavailable-API 404 leaves the homepage spinning for ~7s (v4 default: 3 retries
    // with exponential backoff). 4xx errors are permanent; retry only on network/5xx.
    retry: (failureCount, error) => !isHttpClientError(error) && failureCount < 3,
  });
};
