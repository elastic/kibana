/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import type { EndpointAsset, GetAssetResponse } from '../../../common/endpoint_assets';
import { ENDPOINT_ASSETS_ROUTES } from '../../../common/endpoint_assets';

const QUERY_KEY = 'endpoint-asset-detail';

interface UseAssetDetailParams {
  assetId: string | null;
  enabled?: boolean;
}

interface UseAssetDetailResult {
  asset: EndpointAsset | null;
  loading: boolean;
  error: Error | null;
  refresh: () => void;
}

/**
 * Hook for fetching a single asset's detailed information.
 */
export const useAssetDetail = ({
  assetId,
  enabled = true,
}: UseAssetDetailParams): UseAssetDetailResult => {
  const { services } = useKibana();
  const queryClient = useQueryClient();

  const fetchAssetDetail = useCallback(async (): Promise<GetAssetResponse> => {
    const { http } = services;
    if (!http || !assetId) {
      throw new Error('HTTP service not available or assetId missing');
    }

    const route = ENDPOINT_ASSETS_ROUTES.GET.replace('{assetId}', assetId);
    const response = await http.get<GetAssetResponse>(route);

    return response;
  }, [services, assetId]);

  const { data, isLoading, error } = useQuery({
    queryKey: [QUERY_KEY, assetId],
    queryFn: fetchAssetDetail,
    enabled: enabled && !!assetId,
    staleTime: 30000,
  });

  const refresh = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: [QUERY_KEY, assetId] });
  }, [queryClient, assetId]);

  return {
    asset: data?.asset ?? null,
    loading: isLoading,
    error: error as Error | null,
    refresh,
  };
};
