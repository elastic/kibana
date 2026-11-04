/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useQuery } from '@kbn/react-query';
import type {
  InvestigationSummary,
  ListInvestigationsResponse,
} from '@kbn/agentic-investigations-plugin/common';
import { isHttpClientError } from '../common/http_error';
import {
  SHARED_INVESTIGATIONS_API_VERSION,
  SHARED_INVESTIGATIONS_URL,
} from '../data/investigations/shared_investigations_api';
import { NIGHTSHIFT_INVESTIGATIONS_QUERY_KEY } from '../data/investigations/use_fetch_investigations';
import { useKibana } from '../hooks/use_kibana';

export interface FetchLatestInvestigationResult {
  latestInvestigation?: InvestigationSummary;
  isInitialLoading: boolean;
  error: Error | null;
}

/** The space's most recently created investigation, in progress or not. */
export const useFetchLatestInvestigation = ({
  enabled,
  refetchInterval,
}: {
  enabled: boolean;
  refetchInterval: number | false;
}): FetchLatestInvestigationResult => {
  const { http, agenticInvestigations } = useKibana().services;

  const { data, error, isInitialLoading } = useQuery<ListInvestigationsResponse, Error>({
    queryKey: [...NIGHTSHIFT_INVESTIGATIONS_QUERY_KEY, 'latest'],
    // The list API belongs to agenticInvestigations, an optional dependency.
    enabled: enabled && agenticInvestigations != null,
    queryFn: async ({ signal }) =>
      http.get<ListInvestigationsResponse>(SHARED_INVESTIGATIONS_URL, {
        version: SHARED_INVESTIGATIONS_API_VERSION,
        query: { sort_field: 'created_at', sort_order: 'desc', page: 1, per_page: 1 },
        signal,
      }),
    refetchInterval,
    retry: (failureCount, err) => !isHttpClientError(err) && failureCount < 3,
  });

  return {
    latestInvestigation: data?.results[0],
    isInitialLoading,
    error: error ?? null,
  };
};
