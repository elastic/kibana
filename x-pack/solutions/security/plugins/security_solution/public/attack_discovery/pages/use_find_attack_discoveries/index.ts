/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { HttpSetup, IHttpFetchError, ResponseErrorBody } from '@kbn/core/public';
import type {
  AttackDiscoveryFindResponse,
  AttackDiscoveryFindInternalResponse,
} from '@kbn/elastic-assistant-common';
import {
  API_VERSIONS,
  ATTACK_DISCOVERY_FIND,
  ATTACK_DISCOVERY_INTERNAL_FIND,
  transformAttackDiscoveryAlertFromApi,
} from '@kbn/elastic-assistant-common';
import type {
  QueryObserverResult,
  RefetchOptions,
  RefetchQueryFilters,
} from '@tanstack/react-query';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback, useRef } from 'react';

import { useAppToasts } from '../../../common/hooks/use_app_toasts';
import * as i18n from './translations';
import { useKibanaFeatureFlags } from '../use_kibana_feature_flags';

type ServerError = IHttpFetchError<ResponseErrorBody>;

interface Props {
  alertIds?: string[];
  ids?: string[];
  connectorNames?: string[];
  http: HttpSetup;
  includeUniqueAlertIds?: boolean;
  isAssistantEnabled: boolean;
  end?: string;
  search?: string;
  page?: number;
  perPage?: number;
  refetchOnWindowFocus?: boolean;
  shared?: boolean;
  start?: string;
  status?: string[];
  sortField?: string;
  sortOrder?: string;
}

interface UseFindAttackDiscoveries {
  cancelRequest: () => void;
  data: AttackDiscoveryFindInternalResponse | undefined;
  error: unknown | undefined;
  isLoading: boolean;
  refetch: <TPageData>(
    options?: (RefetchOptions & RefetchQueryFilters<TPageData>) | undefined
  ) => Promise<QueryObserverResult<AttackDiscoveryFindInternalResponse, unknown>>;
  status: 'error' | 'idle' | 'loading' | 'success';
}

interface PageParam {
  page?: number;
  perPage?: number;
}

const DEFAULT_PAGE = 1; // CAUTION: server-side API uses a 1-based page index convention (for consistency with similar existing APIs)
const DEFAULT_PER_PAGE = 10;

export const useFindAttackDiscoveries = ({
  alertIds,
  ids,
  connectorNames,
  http,
  includeUniqueAlertIds = false,
  isAssistantEnabled,
  end,
  search,
  page = DEFAULT_PAGE,
  perPage = DEFAULT_PER_PAGE,
  refetchOnWindowFocus = false,
  shared,
  start,
  status,
  sortField = '@timestamp',
  sortOrder = 'desc',
}: Props): UseFindAttackDiscoveries => {
  const { addError } = useAppToasts();
  const { attackDiscoveryPublicApiEnabled } = useKibanaFeatureFlags();

  const abortController = useRef(new AbortController());

  const cancelRequest = useCallback(() => {
    abortController.current.abort();
    abortController.current = new AbortController(); // LOCAL MUTATION
  }, []);

  const route = attackDiscoveryPublicApiEnabled
    ? ATTACK_DISCOVERY_FIND
    : ATTACK_DISCOVERY_INTERNAL_FIND;

  const version = attackDiscoveryPublicApiEnabled
    ? API_VERSIONS.public.v1
    : API_VERSIONS.internal.v1;

  const queryFn = useCallback(
    async ({ pageParam }: { pageParam?: PageParam }) => {
      const baseQuery = {
        alert_ids: alertIds,
        connector_names: connectorNames,
        end,
        include_unique_alert_ids: includeUniqueAlertIds,
        ids,
        page: pageParam?.page ?? page,
        per_page: pageParam?.perPage ?? perPage,
        search,
        shared,
        sort_field: sortField,
        sort_order: sortOrder,
        start,
        status,
      };

      if (attackDiscoveryPublicApiEnabled) {
        return http.fetch<AttackDiscoveryFindResponse>(route, {
          method: 'GET',
          version,
          query: {
            ...baseQuery,
            enable_field_rendering: true, // always true to enable rendering fields using the `{{ user.name james }}` syntax
            with_replacements: false, // always false because Attack discoveries rendered in Kibana may be passed as context to a conversation, and to enable the user to see the original alert details via the `Show anonymized values` toggle
          },
          signal: abortController.current.signal,
        });
      }

      return http.fetch<AttackDiscoveryFindResponse>(route, {
        method: 'GET',
        version,
        query: baseQuery,
        signal: abortController.current.signal,
      });
    },
    [
      alertIds,
      attackDiscoveryPublicApiEnabled,
      connectorNames,
      end,
      http,
      ids,
      includeUniqueAlertIds,
      page,
      perPage,
      route,
      search,
      shared,
      sortField,
      sortOrder,
      start,
      status,
      version,
    ]
  );

  const getNextPageParam = useCallback((lastPage: AttackDiscoveryFindResponse) => {
    const totalPages = Math.max(
      DEFAULT_PAGE,
      Math.ceil(lastPage.total / (lastPage.per_page ?? DEFAULT_PER_PAGE))
    );

    if (totalPages === lastPage.page) {
      return;
    }

    return {
      ...lastPage,
      page: lastPage.page + 1,
    };
  }, []);

  const {
    data,
    error,
    isLoading,
    refetch,
    status: queryStatus,
  } = useQuery(
    [
      'GET',
      route,
      alertIds,
      connectorNames,
      end,
      ids,
      page,
      perPage,
      search,
      shared,
      sortField,
      sortOrder,
      start,
      status,
      isAssistantEnabled,
    ],
    queryFn,
    {
      enabled: isAssistantEnabled,
      getNextPageParam,
      // Transform the API response's data items into UI-friendly alerts
      // only when the public API is enabled. Otherwise return the raw
      // response shape (internal API uses different field names).
      select: (
        response: AttackDiscoveryFindResponse | AttackDiscoveryFindInternalResponse
      ): AttackDiscoveryFindInternalResponse => {
        if (attackDiscoveryPublicApiEnabled) {
          return {
            connector_names: response.connector_names,
            data: ((response as AttackDiscoveryFindResponse).data ?? []).map(
              transformAttackDiscoveryAlertFromApi // transform each alert from snake_case to camelCase
            ),
            page: response.page,
            per_page: response.per_page,
            total: response.total,
            unique_alert_ids_count: response.unique_alert_ids_count,
            unique_alert_ids: response.unique_alert_ids,
          };
        }

        return response as AttackDiscoveryFindInternalResponse;
      },
      onError: (e: ServerError) => {
        addError(e.body && e.body.message ? new Error(e.body.message) : e, {
          title: i18n.ERROR_FINDING_ATTACK_DISCOVERIES,
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
    status: queryStatus,
  };
};

/**
 * We use this hook to invalidate the attack discovery generations cache.
 *
 * @returns A attack discovery schedule cache invalidation callback
 */
export const useInvalidateFindAttackDiscoveries = () => {
  const queryClient = useQueryClient();
  const { attackDiscoveryPublicApiEnabled } = useKibanaFeatureFlags();

  const route = attackDiscoveryPublicApiEnabled
    ? ATTACK_DISCOVERY_FIND
    : ATTACK_DISCOVERY_INTERNAL_FIND;

  return useCallback(() => {
    queryClient.invalidateQueries(['GET', route], {
      refetchType: 'all',
    });
  }, [queryClient, route]);
};
