/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useQuery } from '@kbn/react-query';
import type { IHttpFetchError } from '@kbn/core-http-browser';
import { useThreatHuntingPrioritiesRoutes } from '../../../api/threat_hunting_priorities';
import type {
  GetThreatHuntingPrioritiesResponse,
  GetThreatHuntingPrioritiesParams,
} from '../../../api/threat_hunting_priorities';

export const THREAT_HUNTING_PRIORITIES_QUERY_KEY = 'threat_hunting_priorities';

export const useThreatHuntingPriorities = (
  params?: GetThreatHuntingPrioritiesParams,
  options?: { enabled?: boolean }
) => {
  const { fetchThreatHuntingPriorities } = useThreatHuntingPrioritiesRoutes();

  return useQuery<GetThreatHuntingPrioritiesResponse, IHttpFetchError>({
    queryKey: [THREAT_HUNTING_PRIORITIES_QUERY_KEY, params],
    queryFn: ({ signal }) => fetchThreatHuntingPriorities({ signal, params }),
    enabled: options?.enabled !== false,
    refetchOnWindowFocus: false,
    keepPreviousData: true,
  });
};

