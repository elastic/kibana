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
  transformAttackDiscoveryAlertFromApi,
} from '@kbn/elastic-assistant-common';
import type { QueryObserverResult, RefetchOptions, RefetchQueryFilters } from '@kbn/react-query';
import { useQuery, useQueryClient } from '@kbn/react-query';
import { useCallback, useRef } from 'react';

import { useAppToasts } from '../../../common/hooks/use_app_toasts';
import * as i18n from './translations';

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
  /**
   * Whether to filter by scheduled or ad-hoc attack-discoveries. If omitted, both scheduled and ad-hoc Attack discoveries are returned. Use `true` to return only scheduled discoveries, `false` to return only ad-hoc.
   */
  scheduled?: boolean;
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
  scheduled,
}: Props): UseFindAttackDiscoveries => {
  const { addError } = useAppToasts();

  const abortController = useRef(new AbortController());

  const cancelRequest = useCallback(() => {
    abortController.current.abort();
    abortController.current = new AbortController(); // LOCAL MUTATION
  }, []);

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
        scheduled,
      };

      return http.fetch<AttackDiscoveryFindResponse>(ATTACK_DISCOVERY_FIND, {
        method: 'GET',
        version: API_VERSIONS.public.v1,
        query: {
          ...baseQuery,
          enable_field_rendering: true, // always true to enable rendering fields using the `{{ user.name james }}` syntax
          with_replacements: false, // always false because Attack discoveries rendered in Kibana may be passed as context to a conversation, and to enable the user to see the original alert details via the `Show anonymized values` toggle
        },
        signal: abortController.current.signal,
      });
    },
    [
      alertIds,
      connectorNames,
      end,
      http,
      ids,
      includeUniqueAlertIds,
      page,
      perPage,
      search,
      shared,
      sortField,
      sortOrder,
      start,
      status,
      scheduled,
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
      ATTACK_DISCOVERY_FIND,
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
      scheduled,
    ],
    queryFn,
    {
      enabled: isAssistantEnabled,
      getNextPageParam,
      // Transform the API response's data items into UI-friendly alerts
      select: (response: AttackDiscoveryFindResponse): AttackDiscoveryFindInternalResponse => {
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

  return useCallback(() => {
    queryClient.invalidateQueries(['GET', ATTACK_DISCOVERY_FIND], {
      refetchType: 'all',
    });
  }, [queryClient]);
};
