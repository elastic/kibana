/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { lastValueFrom } from 'rxjs';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import type { CoreStart } from '@kbn/core/public';
import type { CspClientPluginStartDeps } from '@kbn/cloud-security-posture/src/types';
import type { DataView } from '@kbn/data-views-plugin/common';
import { showDetailsErrorToast } from '../utils';
import type { EntityOrEventItem } from './components/grouped_item/types';

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
  options?: {
    /** Enable / disable the underlying query (defaults true) */
    enabled?: boolean;
    /** Refetch on window focus (defaults true) */
    refetchOnWindowFocus?: boolean;
    /** Keep previous data flag (defaults false) */
    keepPreviousData?: boolean;
  };
}

export interface UseFetchDocumentDetailsResult {
  data: EntityOrEventItem[];
  isLoading: boolean;
  isFetching: boolean;
  isError: boolean;
  error: unknown;
  /** Force a manual refresh */
  refresh: () => void;
}

/** Build a search request for the provided ids */
export const buildDocumentsRequest = (dataViewId: DataView['id'], ids: string[]) => ({
  index: dataViewId,
  size: ids.length, // we expect at most this many docs back
  ignore_unavailable: true,
  track_total_hits: false,
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

const parseItemsFromHits = (hits: DocumentHit[], itemTypes: string[]): EntityOrEventItem[] => {
  return hits.map((hit) => {
    // TODO Fix typing issue and replace `any`
    const hitSource = hit._source as Record<string, any>;
    return {
      itemType: hit._index?.includes('alerts-security.alerts-') ? 'alert' : 'event',
      id: hitSource.event.id,
      timestamp: hitSource['@timestamp'],
      action: hitSource.event.action,
      actor: { id: hitSource.actor.entity.id },
      target: { id: hitSource.target.entity.id },
      ip: hitSource.source.ip,
      countryCode: hitSource.source.geo.country_iso_code,
    };
  });
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
  const {
    data,
    notifications: { toasts },
  } = useKibana<CoreStart & CspClientPluginStartDeps>().services;

  // Normalize & sanitize ids (remove undefined / empty, de-duplicate for a stable key)
  const normalizedIds = useMemo(
    () => (ids ? Array.from(new Set(ids.filter((v): v is string => !!v))) : []),
    [ids]
  );

  const queryKey = useMemo(
    () => ['useFetchDocumentDetails', dataViewId, normalizedIds.join(',')],
    [dataViewId, normalizedIds]
  );

  const queryClient = useQueryClient();

  interface SearchRawResponse {
    rawResponse?: {
      hits?: { hits?: Array<DocumentHit<_Source>> };
    };
  }

  const {
    isLoading,
    isFetching,
    isError,
    error,
    data: hits,
  } = useQuery<DocumentHit<_Source>[]>(
    queryKey,
    async () => {
      if (!dataViewId) {
        return Promise.reject(new Error('Index is required to fetch document details'));
      }
      if (!normalizedIds.length) {
        return [];
      }
      try {
        const search$ = data.search.search({
          params: buildDocumentsRequest(dataViewId, normalizedIds),
        });
        const response = (await lastValueFrom(search$)) as unknown as SearchRawResponse; // Cast: we only access rawResponse.hits.hits
        const esHits: DocumentHit<_Source>[] = response?.rawResponse?.hits?.hits ?? [];
        return esHits;
      } catch (err) {
        const e = err as unknown;
        // Attempt to extract message from possible transport error shape
        const message =
          (typeof e === 'object' &&
            e !== null &&
            'body' in e &&
            typeof (e as { body?: { message?: string } }).body?.message === 'string' &&
            (e as { body?: { message?: string } }).body?.message) ||
          (e as Error)?.message ||
          'Unknown error';
        throw new Error(message);
      }
    },
    {
      enabled: (options?.enabled ?? true) && !!dataViewId && normalizedIds.length > 0,
      refetchOnWindowFocus: options?.refetchOnWindowFocus ?? true,
      keepPreviousData: options?.keepPreviousData ?? false,
      onError: (e) => showDetailsErrorToast(toasts, e),
    }
  );

  return {
    data: hits ? parseItemsFromHits(hits, []) : [],
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
