/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { HttpSetup } from '@kbn/core/public';
import { API_VERSIONS, ATTACK_DISCOVERY_GENERATIONS } from '@kbn/elastic-assistant-common';
import type {
  QueryObserverResult,
  RefetchOptions,
  RefetchQueryFilters,
} from '@tanstack/react-query';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback, useRef } from 'react';
import type {
  GetAttackDiscoveryGenerationsRequestQuery,
  GetAttackDiscoveryGenerationsResponse,
} from '@kbn/elastic-assistant-common';

import { useKibanaFeatureFlags } from '../use_kibana_feature_flags';

interface Props extends GetAttackDiscoveryGenerationsRequestQuery {
  http: HttpSetup;
  isAssistantEnabled: boolean;
  refetchOnWindowFocus?: boolean;
}

interface UseGetAttackDiscoveryGenerations {
  cancelRequest: () => void;
  data: GetAttackDiscoveryGenerationsResponse | undefined;
  error: unknown | undefined;
  isLoading: boolean;
  refetch: <TPageData>(
    options?: (RefetchOptions & RefetchQueryFilters<TPageData>) | undefined
  ) => Promise<QueryObserverResult<GetAttackDiscoveryGenerationsResponse, unknown>>;
  status: 'error' | 'idle' | 'loading' | 'success';
}

export const useGetAttackDiscoveryGenerations = ({
  end,
  http,
  isAssistantEnabled,
  size,
  start,
  refetchOnWindowFocus = false,
}: Props): UseGetAttackDiscoveryGenerations => {
  const { attackDiscoveryAlertsEnabled } = useKibanaFeatureFlags();
  const abortController = useRef(new AbortController());

  const cancelRequest = useCallback(() => {
    abortController.current.abort();
    abortController.current = new AbortController(); // LOCAL MUTATION
  }, []);

  const queryFn = useCallback(async () => {
    return http.fetch<GetAttackDiscoveryGenerationsResponse>(ATTACK_DISCOVERY_GENERATIONS, {
      method: 'GET',
      version: API_VERSIONS.internal.v1,
      query: {
        end,
        size,
        start,
      },
      signal: abortController.current.signal,
    });
  }, [end, http, size, start]);

  const { data, error, isLoading, refetch, status } = useQuery(
    ['GET', ATTACK_DISCOVERY_GENERATIONS, end, isAssistantEnabled, size, start],
    queryFn,
    {
      enabled: isAssistantEnabled && attackDiscoveryAlertsEnabled,
      refetchOnWindowFocus,
    }
  );

  return {
    cancelRequest,
    data,
    error,
    isLoading,
    refetch,
    status,
  };
};

/**
 * We use this hook to invalidate the attack discovery generations cache.
 *
 * @returns A attack discovery schedule cache invalidation callback
 */
export const useInvalidateGetAttackDiscoveryGenerations = () => {
  const queryClient = useQueryClient();

  return useCallback(() => {
    queryClient.invalidateQueries(['GET', ATTACK_DISCOVERY_GENERATIONS], {
      refetchType: 'all',
    });
  }, [queryClient]);
};
