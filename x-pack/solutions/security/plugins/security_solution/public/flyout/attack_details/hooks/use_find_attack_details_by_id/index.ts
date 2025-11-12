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
import type { QueryObserverResult, RefetchOptions, RefetchQueryFilters } from '@kbn/react-query';
import { useQuery } from '@kbn/react-query';
import { useCallback, useRef } from 'react';

import { useAppToasts } from '../../../../common/hooks/use_app_toasts';
import * as i18n from './translations';
import { useKibanaFeatureFlags } from '../../../../attack_discovery/pages/use_kibana_feature_flags';

type ServerError = IHttpFetchError<ResponseErrorBody>;

interface Props {
  id: string;
  http: HttpSetup;
  isAssistantEnabled: boolean;
  refetchOnWindowFocus?: boolean;
}

type AttackDiscoveryInternalItem =
  | AttackDiscoveryFindInternalResponse
  | (AttackDiscoveryFindResponse extends { data: (infer U)[] }
      ? ReturnType<typeof transformAttackDiscoveryAlertFromApi>
      : unknown);

export type AttackDiscoveryItem = AttackDiscoveryFindResponse extends { data: (infer U)[] }
  ? ReturnType<typeof transformAttackDiscoveryAlertFromApi>
  : unknown;

interface UseFindAttackDiscoveryById {
  cancelRequest: () => void;
  data: AttackDiscoveryItem | undefined;
  error: unknown | undefined;
  isLoading: boolean;
  refetch: <TPageData>(
    options?: (RefetchOptions & RefetchQueryFilters<TPageData>) | undefined
  ) => Promise<QueryObserverResult<AttackDiscoveryInternalItem | undefined, unknown>>;
  status: 'error' | 'idle' | 'loading' | 'success';
}

/**
 * Fetch a single attack discovery by document id using the FIND endpoint.
 * Uses the public/internal FIND route depending on the feature flag and
 * maps the public API shape into the internal UI shape.
 */
export const useFindAttackDetailsById = ({
  id,
  http,
  isAssistantEnabled,
  refetchOnWindowFocus = false,
}: Props): UseFindAttackDiscoveryById => {
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

  const queryFn = useCallback(async () => {
    const baseQuery = {
      ids: [id],
      page: 1,
      per_page: 1,
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

    return http.fetch<AttackDiscoveryFindInternalResponse>(route, {
      method: 'GET',
      version,
      query: baseQuery,
      signal: abortController.current.signal,
    });
  }, [http, route, version, id, attackDiscoveryPublicApiEnabled]);

  const { data, error, isLoading, refetch, status } = useQuery(
    ['GET', route, id, isAssistantEnabled],
    queryFn,
    {
      enabled: isAssistantEnabled,
      // Transform the API response's data items into UI-friendly alerts
      // only when the public API is enabled. Otherwise return the raw
      // response shape (internal API uses different field names).
      select: (
        response: AttackDiscoveryFindResponse | AttackDiscoveryFindInternalResponse
      ): AttackDiscoveryInternalItem => {
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
          title: i18n.ERROR_FINDING_ATTACK_DETAILS_BY_ID,
        });
      },
      refetchOnWindowFocus,
    }
  );

  // Expose the first item of the transformed `data` array when the public API is used.
  const attackDetailsData = attackDiscoveryPublicApiEnabled
    ? (
        (data as AttackDiscoveryFindResponse | undefined)?.data as unknown as
          | AttackDiscoveryItem[]
          | undefined
      )?.[0]
    : undefined;

  return {
    cancelRequest,
    data: attackDetailsData,
    error,
    isLoading,
    refetch: () => refetch(),
    status,
  };
};
