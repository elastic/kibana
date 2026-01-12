/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { lastValueFrom } from 'rxjs';
import type * as estypes from '@elastic/elasticsearch/lib/api/types';
import type { IKibanaSearchResponse, IKibanaSearchRequest } from '@kbn/search-types';
import { useKibana } from '../../common/lib/kibana';

const QUERY_KEY = 'endpoint-assets-list';

/** Query the fact index directly instead of Entity Store for better performance */
const ENDPOINT_ASSETS_INDEX = 'endpoint-assets-osquery-*';

interface EndpointAssetHit {
  '@timestamp': string;
  entity?: {
    id?: string;
    name?: string;
    source?: string;
    type?: string;
    sub_type?: string;
  };
  asset?: {
    platform?: string;
    category?: string;
    criticality?: string;
  };
  host?: {
    id?: string;
    name?: string;
    hostname?: string;
    os?: {
      name?: string;
      platform?: string;
      version?: string;
      family?: string;
      kernel?: string;
      build?: string;
      type?: string;
    };
  };
  agent?: {
    id?: string;
    name?: string;
    type?: string;
    version?: string;
  };
  event?: {
    ingested?: string;
  };
}

export interface EndpointAssetRecord {
  id: string;
  name: string;
  hostname: string;
  platform: string;
  osName: string;
  osVersion: string;
  agentId: string;
  agentName: string;
  lastSeen: string;
  source: string;
}

interface UseEndpointAssetsResult {
  assets: EndpointAssetRecord[];
  loading: boolean;
  error: Error | null;
  refresh: () => void;
  total: number;
  summary: {
    total: number;
    active24h: number;
    criticalPosture: number;
    elevatedPrivileges: number;
    recentlyChanged: number;
  } | null;
}

type EntitySearchRequest = IKibanaSearchRequest<estypes.SearchRequest>;
type EntitySearchResponse = IKibanaSearchResponse<estypes.SearchResponse<EndpointAssetHit, never>>;

/**
 * Hook for fetching endpoint assets from the fact index.
 *
 * Queries the endpoint-assets-osquery-* index directly for better
 * performance and to avoid Entity Store reprocessing overhead.
 */
export const useEndpointAssets = (): UseEndpointAssetsResult => {
  const { services } = useKibana();
  const queryClient = useQueryClient();

  const fetchAssets = useCallback(async (): Promise<{
    assets: EndpointAssetRecord[];
    total: number;
  }> => {
    const { data } = services;
    if (!data?.search) {
      throw new Error('Search service not available');
    }

    const searchRequest: estypes.SearchRequest = {
      index: ENDPOINT_ASSETS_INDEX,
      size: 500,
      sort: [{ '@timestamp': 'desc' }],
      query: {
        match_all: {},
      },
    };

    const response = await lastValueFrom(
      data.search.search<EntitySearchRequest, EntitySearchResponse>({
        params: searchRequest as EntitySearchRequest['params'],
      })
    );

    const hits = response.rawResponse.hits.hits;
    const total =
      typeof response.rawResponse.hits.total === 'number'
        ? response.rawResponse.hits.total
        : response.rawResponse.hits.total?.value ?? 0;

    // Transform fact index records to EndpointAssetRecord format
    const assets: EndpointAssetRecord[] = hits.map((hit) => {
      const source = hit._source!;
      return {
        id: source.entity?.id || source.host?.id || hit._id || 'unknown',
        name: source.entity?.name || source.host?.hostname || source.host?.name || 'Unknown',
        hostname: source.host?.hostname || source.host?.name || '',
        platform: source.host?.os?.platform || source.asset?.platform || 'unknown',
        osName: source.host?.os?.name || 'Unknown',
        osVersion: source.host?.os?.version || '',
        agentId: source.agent?.id || '',
        agentName: source.agent?.name || '',
        lastSeen: source['@timestamp'],
        source: source.entity?.source || hit._index || 'Osquery',
      };
    });

    return { assets, total };
  }, [services]);

  const { data, isLoading, error } = useQuery({
    queryKey: [QUERY_KEY],
    queryFn: fetchAssets,
    staleTime: 30000, // Consider data stale after 30 seconds
    refetchOnWindowFocus: true,
  });

  const refresh = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
  }, [queryClient]);

  // Calculate summary statistics from the data
  const summary = useMemo(() => {
    if (!data?.assets) return null;

    const now = new Date();
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    const active24h = data.assets.filter((asset) => {
      const lastSeen = new Date(asset.lastSeen);
      return lastSeen >= oneDayAgo;
    }).length;

    return {
      total: data.total,
      active24h,
      criticalPosture: 0, // Not available from Entity Store yet
      elevatedPrivileges: 0, // Not available from Entity Store yet
      recentlyChanged: 0, // Not available from Entity Store yet
    };
  }, [data]);

  return {
    assets: data?.assets ?? [],
    loading: isLoading,
    error: error as Error | null,
    refresh,
    total: data?.total ?? 0,
    summary,
  };
};
