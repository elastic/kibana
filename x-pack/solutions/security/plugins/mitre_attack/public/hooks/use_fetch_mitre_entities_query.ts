/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { UseQueryOptions } from '@kbn/react-query';
import { useQuery } from '@kbn/react-query';
import type { IHttpFetchError } from '@kbn/core-http-browser';
import type { HttpStart } from '@kbn/core/public';
import type {
  GetMitreEntitiesRequestParams,
  GetMitreEntitiesResponse,
} from '@kbn/security-mitre-attack-common';
import { GET_MITRE_ENTITIES_URL } from '@kbn/security-mitre-attack-common';
import { fetchMitreEntities } from '../api/fetch_mitre_entities';

// The managed route returns 503 when population has not finished; other errors are permanent.
const isServiceUnavailable = (error: unknown): boolean => {
  const httpError = error as IHttpFetchError<{ statusCode?: number }>;
  return httpError?.response?.status === 503 || httpError?.body?.statusCode === 503;
};

const MAX_RETRIES = 3;
const RETRY_BASE_DELAY_MS = 1000;
const MAX_RETRY_DELAY_MS = 30_000;

// Only retry transient 503s (population in progress); all other failures are final.
// Exponential backoff gives the data service time to finish populating saved objects.
const DEFAULT_OPTIONS: UseQueryOptions<GetMitreEntitiesResponse> = {
  staleTime: Infinity,
  retry: (failureCount, error) => isServiceUnavailable(error) && failureCount < MAX_RETRIES,
  retryDelay: (attempt) => Math.min(RETRY_BASE_DELAY_MS * 2 ** attempt, MAX_RETRY_DELAY_MS),
  refetchOnWindowFocus: false,
};

export const FETCH_MITRE_ENTITIES_QUERY_KEY = ['GET', GET_MITRE_ENTITIES_URL] as const;

/**
 * Fetches MITRE ATT&CK entities from the managed API.
 */
export const useFetchMitreEntitiesQuery = (
  http: HttpStart,
  params: GetMitreEntitiesRequestParams = {},
  options?: UseQueryOptions<GetMitreEntitiesResponse>
) => {
  return useQuery<GetMitreEntitiesResponse>(
    [...FETCH_MITRE_ENTITIES_QUERY_KEY, params],
    ({ signal }) => fetchMitreEntities({ http, ...params, signal }),
    {
      ...DEFAULT_OPTIONS,
      ...options,
    }
  );
};
