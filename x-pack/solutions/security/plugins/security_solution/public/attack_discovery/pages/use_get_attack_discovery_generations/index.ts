/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { HttpSetup, IHttpFetchError, ResponseErrorBody } from '@kbn/core/public';
import {
  API_VERSIONS,
  ATTACK_DISCOVERY_GENERATIONS,
  ATTACK_DISCOVERY_GENERATIONS_INTERNAL,
} from '@kbn/elastic-assistant-common';
import type {
  GetAttackDiscoveryGenerationsRequestQuery,
  GetAttackDiscoveryGenerationsResponse,
} from '@kbn/elastic-assistant-common';
import type {
  QueryObserverResult,
  RefetchOptions,
  RefetchQueryFilters,
} from '@tanstack/react-query';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback, useRef } from 'react';
import { useKibanaFeatureFlags } from '../use_kibana_feature_flags';

import { useAppToasts } from '../../../common/hooks/use_app_toasts';
import * as i18n from './translations';

type ServerError = IHttpFetchError<ResponseErrorBody>;

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
  const { attackDiscoveryPublicApiEnabled } = useKibanaFeatureFlags();
  const { addError } = useAppToasts();
  const abortController = useRef(new AbortController());

  const cancelRequest = useCallback(() => {
    abortController.current.abort();
    abortController.current = new AbortController(); // LOCAL MUTATION
  }, []);

  const queryFn = useCallback(async () => {
    const route = attackDiscoveryPublicApiEnabled
      ? ATTACK_DISCOVERY_GENERATIONS
      : ATTACK_DISCOVERY_GENERATIONS_INTERNAL;

    const version = attackDiscoveryPublicApiEnabled
      ? API_VERSIONS.public.v1
      : API_VERSIONS.internal.v1;

    return http.fetch<GetAttackDiscoveryGenerationsResponse>(route, {
      method: 'GET',
      version,
      query: {
        end,
        size,
        start,
      },
      signal: abortController.current.signal,
    });
  }, [attackDiscoveryPublicApiEnabled, end, http, size, start]);

  const routeKey = attackDiscoveryPublicApiEnabled
    ? ATTACK_DISCOVERY_GENERATIONS
    : ATTACK_DISCOVERY_GENERATIONS_INTERNAL;

  const { data, error, isLoading, refetch, status } = useQuery(
    ['GET', routeKey, end, isAssistantEnabled, size, start],
    queryFn,
    {
      enabled: isAssistantEnabled,
      onError: (e: ServerError) => {
        addError(e.body && e.body.message ? new Error(e.body.message) : e, {
          title: i18n.ERROR_RETRIEVING_ATTACK_DISCOVERY_GENERATIONS,
        });
      },
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
  const { attackDiscoveryPublicApiEnabled } = useKibanaFeatureFlags();

  return useCallback(() => {
    const routeKey = attackDiscoveryPublicApiEnabled
      ? ATTACK_DISCOVERY_GENERATIONS
      : ATTACK_DISCOVERY_GENERATIONS_INTERNAL;

    queryClient.invalidateQueries(['GET', routeKey], {
      refetchType: 'all',
    });
  }, [queryClient, attackDiscoveryPublicApiEnabled]);
};
