/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';
import { useQuery, useQueryClient } from '@kbn/react-query';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import type { CoreStart } from '@kbn/core/public';
import type { CspClientPluginStartDeps } from '@kbn/cloud-security-posture/src/types';
import type {
  EntitiesResponse,
  EntityItem,
} from '@kbn/cloud-security-posture-common/types/graph_entities/v1';
import type {
  EventsResponse,
  EventOrAlertItem,
} from '@kbn/cloud-security-posture-common/types/graph_events/v1';
import { showDetailsErrorToast } from '../utils';

const ENTITIES_API = '/internal/cloud_security_posture/graph/entities';
const EVENTS_API = '/internal/cloud_security_posture/graph/events';

export interface UseFetchDocumentDetailsParams {
  /** Type of documents to fetch */
  type: 'entities' | 'events';
  /** Document IDs to retrieve (entity IDs or event IDs) */
  documentIds: string[];
  /** Time range start */
  start: string | number;
  /** Time range end */
  end: string | number;
  /** Pagination parameters */
  page: {
    index: number;
    size: number;
  };
  /** Optional flags */
  options?: {
    /** Enable / disable the underlying query (defaults true) */
    enabled?: boolean;
    /** Refetch on window focus (defaults true) */
    refetchOnWindowFocus?: boolean;
  };
}

export interface UseFetchDocumentDetailsResult {
  data: {
    items: Array<EntityItem | EventOrAlertItem>;
    totalRecords: number;
  };
  isLoading: boolean;
  isFetching: boolean;
  isError: boolean;
  error: unknown;
  /** Force a manual refresh */
  refresh: () => void;
}

/**
 * Hook to fetch enriched document details from the document details API.
 * Supports both entities and events/alerts with server-side enrichment via entity store.
 * Server-side pagination is used to slice IDs before querying ESQL.
 */
export const useFetchDocumentDetails = ({
  type,
  documentIds,
  start,
  end,
  page,
  options,
}: UseFetchDocumentDetailsParams): UseFetchDocumentDetailsResult => {
  const {
    http,
    notifications: { toasts },
  } = useKibana<CoreStart & CspClientPluginStartDeps>().services;

  // Normalize & sanitize ids (remove empty, de-duplicate for a stable key)
  const normalizedIds = useMemo(
    () => Array.from(new Set(documentIds.filter((v): v is string => !!v))),
    [documentIds]
  );

  const queryKey = useMemo(
    () => [
      'useFetchDocumentDetails',
      type,
      normalizedIds.join(','),
      start,
      end,
      page.index,
      page.size,
    ],
    [type, normalizedIds, start, end, page.index, page.size]
  );

  const queryClient = useQueryClient();

  const { isLoading, isFetching, isError, error, data } = useQuery(
    queryKey,
    async () => {
      if (!http) {
        throw new Error('Http service is not available');
      }

      if (normalizedIds.length === 0) {
        return { items: [], totalRecords: 0 };
      }

      if (type === 'entities') {
        const response = await http.post<EntitiesResponse>(ENTITIES_API, {
          version: '1',
          body: JSON.stringify({
            page: {
              index: page.index,
              size: page.size,
            },
            query: {
              entityIds: normalizedIds,
              start,
              end,
            },
          }),
        });
        return { items: response.entities, totalRecords: response.totalRecords };
      } else {
        const response = await http.post<EventsResponse>(EVENTS_API, {
          version: '1',
          body: JSON.stringify({
            page: {
              index: page.index,
              size: page.size,
            },
            query: {
              eventIds: normalizedIds,
              start,
              end,
            },
          }),
        });
        return { items: response.events, totalRecords: response.totalRecords };
      }
    },
    {
      enabled: (options?.enabled ?? true) && normalizedIds.length > 0,
      refetchOnWindowFocus: options?.refetchOnWindowFocus ?? true,
      onError: (e: unknown) => showDetailsErrorToast(toasts, e),
    }
  );

  return {
    data: data ?? { items: [], totalRecords: 0 },
    isLoading,
    isFetching,
    isError,
    error,
    refresh: () => {
      queryClient.invalidateQueries(queryKey);
    },
  };
};
