/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useQuery, type UseQueryResult } from '@kbn/react-query';
import type { SeverityCountsResponse } from '@kbn/nightshift-investigations-plugin/common';
import { isHttpClientError } from '../common/http_error';
import { useKibana } from './use_kibana';

export const NIGHTSHIFT_SEVERITY_COUNTS_QUERY_KEY = ['nightshift.severityCounts'] as const;

export interface FetchSeverityCountsParams {
  query?: string;
}

/**
 * Severity tile counts.
 *
 * Separate from `useFetchInvestigations` on purpose: the counts do not depend on pagination, sort
 * or the selected severity, so they must not refetch when those change. Keeping them on their own
 * query key means paging through the list reuses the cached counts, and the list renders without
 * waiting on the aggregation.
 */
export const useFetchSeverityCounts = ({ query }: FetchSeverityCountsParams = {}): UseQueryResult<
  SeverityCountsResponse,
  Error
> => {
  const investigationsClient = useKibana().services.nightshiftInvestigations?.investigationsClient;

  return useQuery<SeverityCountsResponse, Error>({
    queryKey: [...NIGHTSHIFT_SEVERITY_COUNTS_QUERY_KEY, query],
    // investigationsClient is undefined when the plugin is unavailable (optional dep)
    enabled: investigationsClient != null,
    queryFn: async ({ signal }) => {
      if (!investigationsClient) {
        // enabled guards this at runtime; TS cannot see that from inside the closure
        throw new Error('Nightshift investigations plugin is unavailable');
      }
      return investigationsClient.fetch(
        'GET /internal/nightshift/investigations/_severity_counts',
        {
          params: { query: { ...(query ? { query } : {}) } },
          signal: signal ?? null,
        }
      );
    },
    keepPreviousData: true,
    // Matches useFetchInvestigations: 4xx is permanent, only retry network/5xx.
    retry: (failureCount, error) => !isHttpClientError(error) && failureCount < 3,
  });
};
