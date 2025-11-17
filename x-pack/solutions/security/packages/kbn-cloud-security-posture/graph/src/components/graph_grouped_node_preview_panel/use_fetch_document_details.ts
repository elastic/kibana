/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';
import { useQuery, useQueryClient } from '@kbn/react-query';
import { lastValueFrom } from 'rxjs';
import { number } from 'io-ts';
import type { EsHitRecord } from '@kbn/discover-utils/types';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import type { CoreStart } from '@kbn/core/public';
import type { CspClientPluginStartDeps } from '@kbn/cloud-security-posture/src/types';
import type { DataView } from '@kbn/data-views-plugin/common';
import { showDetailsErrorToast } from '../utils';
import type { EventItem, AlertItem } from './components/grouped_item/types';

// Minimal shape of an ES hit we care about. (Avoid pulling large shared types until needed.)
export interface DocumentHit<_Source = unknown> {
  _id: string;
  _index?: string;
  _score?: number | null;
  _source?: _Source;
  fields?: Record<string, unknown>;
  sort?: unknown[];
}

export interface UseFetchDocumentDetailsParams {
  /** Index (or index pattern) where the documents live */
  dataViewId: DataView['id'];
  /** Document ids to retrieve */
  ids: Array<string | undefined> | undefined;
  /** Optional flags */
  options: {
    /** Current page index (0-based) */
    pageIndex: number;
    /** Number of elements to fetch per page */
    pageSize: number;
    /** Enable / disable the underlying query (defaults true) */
    enabled?: boolean;
    /** Refetch on window focus (defaults true) */
    refetchOnWindowFocus?: boolean;
    /** Keep previous data flag (defaults false) */
    keepPreviousData?: boolean;
  };
}

export interface UseFetchDocumentDetailsResult {
  data: {
    page: (EventItem | AlertItem)[];
    total: number;
  };
  isLoading: boolean;
  isFetching: boolean;
  isError: boolean;
  error: unknown;
  /** Force a manual refresh */
  refresh: () => void;
}

/** Build a search request for the provided ids */
export const buildDocumentsRequest = (
  dataViewId: DataView['id'],
  ids: string[],
  pageIndex: number,
  pageSize: number
) => ({
  index: dataViewId,
  size: pageSize,
  from: pageIndex * pageSize,
  ignore_unavailable: true,
  track_total_hits: true,
  query: {
    bool: {
      filter: [
        {
          terms: {
            'event.id': ids,
          },
        },
      ],
    },
  },
});

const buildItemFromHit = (hit: EsHitRecord): EventItem | AlertItem => {
  // TODO Fix typing issue and replace `any`
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const hitSource = hit._source as Record<string, any>;
  return {
    itemType: hit._index?.includes('alerts-security.alerts-') ? 'alert' : 'event',
    id: hitSource.event?.id,
    timestamp: hitSource['@timestamp'],
    action: hitSource.event?.action,
    actor: { id: hitSource.actor?.entity?.id },
    target: { id: hitSource.target?.entity?.id },
    ip: hitSource.source?.ip,
    countryCode: hitSource.source?.geo?.country_iso_code,
  };
};

/**
 * Hook to fetch full document details for a list of document ids using a single
 * Elasticsearch search request (ids query). Returns an array of hits preserving
 * the ES hit structure so consumers can access source/fields as needed.
 */
export const useFetchDocumentDetails = <_Source = unknown>({
  dataViewId,
  ids,
  options,
}: UseFetchDocumentDetailsParams): UseFetchDocumentDetailsResult => {
  const missingDataView = !dataViewId;
  const {
    data: dataService,
    notifications: { toasts },
  } = useKibana<CoreStart & CspClientPluginStartDeps>().services;

  // Normalize & sanitize ids (remove undefined / empty, de-duplicate for a stable key)
  const normalizedIds = useMemo(
    () => (ids ? Array.from(new Set(ids.filter((v): v is string => !!v))) : []),
    [ids]
  );

  const queryKey = useMemo(
    () => [
      'useFetchDocumentDetails',
      dataViewId,
      normalizedIds.join(','),
      options.pageIndex,
      options.pageSize,
    ],
    [dataViewId, normalizedIds, options.pageIndex, options.pageSize]
  );

  const queryClient = useQueryClient();

  const { isLoading, isFetching, isError, error, data } = useQuery(
    queryKey,
    async () => {
      if (missingDataView || normalizedIds.length === 0) {
        return { page: [], total: 0 };
      }
      const search$ = dataService.search.search({
        params: buildDocumentsRequest(
          dataViewId,
          normalizedIds,
          options.pageIndex,
          options.pageSize
        ),
      });
      const response = await lastValueFrom(search$);
      const { hits } = response?.rawResponse;
      return {
        page: hits.hits.map((hit) => buildItemFromHit(hit as EsHitRecord)),
        total: number.is(hits.total)
          ? hits.total
          : hits.total && number.is(hits.total.value)
          ? hits.total.value
          : 0,
      };
    },
    {
      enabled: !missingDataView && (options.enabled ?? true) && normalizedIds.length > 0,
      refetchOnWindowFocus: options.refetchOnWindowFocus ?? true,
      keepPreviousData: options.keepPreviousData ?? false,
      onError: (e: unknown) => showDetailsErrorToast(toasts, e),
    }
  );

  if (missingDataView) {
    return {
      data: { page: [], total: 0 },
      isLoading: false,
      isFetching: false,
      isError: false,
      error: null,
      refresh: () => {},
    };
  }

  return {
    data: data ?? { page: [], total: 0 },
    isLoading,
    isFetching,
    isError,
    error,
    refresh: () => {
      queryClient.invalidateQueries(queryKey);
    },
  };
};

export type { UseFetchDocumentDetailsParams as UseFetchDocumentDetailsHookParams };
