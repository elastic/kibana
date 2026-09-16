/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { UseQueryOptions } from '@kbn/react-query';
import { useQuery } from '@kbn/react-query';
import type { CoreStart } from '@kbn/core/public';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import type {
  GetMitreEntitiesRequestParams,
  GetMitreEntitiesResponse,
} from '@kbn/security-mitre-attack-common';
import { GET_MITRE_ENTITIES_URL } from '@kbn/security-mitre-attack-common';
import { fetchMitreEntities } from '../api/fetch_mitre_entities';

// MITRE reference data is static per Kibana process, so it never goes stale within a
// session. retry: false ensures the UI error state surfaces immediately on failure
// rather than silently retrying.
const DEFAULT_OPTIONS = {
  staleTime: Infinity,
  retry: false,
  refetchOnWindowFocus: false,
} as const;

export const FETCH_MITRE_ENTITIES_QUERY_KEY = ['GET', GET_MITRE_ENTITIES_URL] as const;

export const useFetchMitreEntitiesQuery = (
  params: GetMitreEntitiesRequestParams = {},
  options?: UseQueryOptions<GetMitreEntitiesResponse>
) => {
  const { services } = useKibana<CoreStart>();
  return useQuery<GetMitreEntitiesResponse>(
    [...FETCH_MITRE_ENTITIES_QUERY_KEY, params],
    ({ signal }) => fetchMitreEntities({ http: services.http, ...params, signal }),
    {
      ...DEFAULT_OPTIONS,
      ...options,
    }
  );
};
