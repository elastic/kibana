/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { lastValueFrom } from 'rxjs';
import type * as estypes from '@elastic/elasticsearch/lib/api/types';
import type { IKibanaSearchResponse, IKibanaSearchRequest } from '@kbn/search-types';
import { useKibana } from '../../../../common/lib/kibana';
import type { HostDetailsData } from '../types';
import { ENDPOINT_ASSETS_QUERY_KEY, ENTITY_STORE_HOST_INDEX } from '../constants';

type DetailSearchRequest = IKibanaSearchRequest<estypes.SearchRequest>;
type DetailSearchResponse = IKibanaSearchResponse<
  estypes.SearchResponse<HostDetailsData, never>
>;

export interface UseEndpointAssetDataResult {
  data: HostDetailsData | null;
  isLoading: boolean;
  error: Error | null;
  refetch: () => void;
}

/**
 * Hook to fetch endpoint asset data from Entity Store by host.name
 * This is adapted from the useHostDetails hook in host_details_page.tsx
 * but queries by host.name instead of entity.id
 */
export const useEndpointAssetData = (hostName: string | null): UseEndpointAssetDataResult => {
  const { services } = useKibana();

  const fetchHostDetails = useCallback(async (): Promise<HostDetailsData | null> => {
    if (!hostName) return null;

    const { data } = services;
    if (!data?.search) {
      throw new Error('Search service not available');
    }

    // Query Entity Store by host.name or entity.name
    const searchRequest: estypes.SearchRequest = {
      index: ENTITY_STORE_HOST_INDEX,
      size: 1,
      sort: [{ '@timestamp': 'desc' }],
      query: {
        bool: {
          should: [
            { term: { 'host.name': hostName } },
            { term: { 'entity.name': hostName } },
          ],
          minimum_should_match: 1,
        },
      },
    };

    const response$ = data.search.search<DetailSearchRequest, DetailSearchResponse>({
      params: searchRequest,
    });

    const response = await lastValueFrom(response$);
    const hit = response.rawResponse.hits.hits[0];

    return hit?._source ?? null;
  }, [hostName, services]);

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: [ENDPOINT_ASSETS_QUERY_KEY, hostName],
    queryFn: fetchHostDetails,
    enabled: !!hostName,
    staleTime: 30000, // Cache for 30 seconds
  });

  return {
    data: data ?? null,
    isLoading,
    error: error as Error | null,
    refetch,
  };
};

/**
 * Helper to extract first value from potential array (ES may return arrays)
 */
export const getFirst = <T,>(value: T | T[] | undefined): T | undefined => {
  if (Array.isArray(value)) {
    return value[0];
  }
  return value;
};

/**
 * Helper to normalize platform string
 */
export const normalizePlatform = (platform?: string): 'windows' | 'macos' | 'linux' | null => {
  if (!platform) return null;
  const normalized = platform.toLowerCase();
  if (normalized.includes('windows')) return 'windows';
  if (normalized.includes('macos') || normalized.includes('darwin')) return 'macos';
  if (normalized.includes('linux')) return 'linux';
  return null;
};

/**
 * Helper to get posture level color
 */
export const getPostureLevelColor = (level?: string): string => {
  if (!level) return 'default';
  const normalized = level.toLowerCase();
  if (normalized === 'high' || normalized === 'good') return 'success';
  if (normalized === 'medium' || normalized === 'moderate') return 'warning';
  if (normalized === 'low' || normalized === 'poor' || normalized === 'critical') return 'danger';
  return 'default';
};
