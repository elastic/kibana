/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import type { TransformStatusResponse } from '../../../common/endpoint_assets';
import { ENDPOINT_ASSETS_ROUTES } from '../../../common/endpoint_assets';

const QUERY_KEY = 'endpoint-assets-transform-status';

interface UseTransformStatusResult {
  status: TransformStatusResponse | null;
  loading: boolean;
  error: Error | null;
  refresh: () => void;
  startTransform: () => Promise<void>;
  stopTransform: () => Promise<void>;
  isStarting: boolean;
  isStopping: boolean;
}

/**
 * Hook for managing the endpoint assets transform.
 */
export const useTransformStatus = (): UseTransformStatusResult => {
  const { services } = useKibana();
  const queryClient = useQueryClient();

  const fetchTransformStatus = useCallback(async (): Promise<TransformStatusResponse> => {
    const { http } = services;
    if (!http) {
      throw new Error('HTTP service not available');
    }

    const response = await http.get<TransformStatusResponse>(
      ENDPOINT_ASSETS_ROUTES.TRANSFORM_STATUS
    );

    return response;
  }, [services]);

  const { data, isLoading, error } = useQuery({
    queryKey: [QUERY_KEY],
    queryFn: fetchTransformStatus,
    staleTime: 10000, // Refresh more frequently for transform status
    refetchInterval: 30000, // Poll every 30 seconds
  });

  const refresh = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
  }, [queryClient]);

  // Mutation for starting transform
  const startMutation = useMutation({
    mutationFn: async () => {
      const { http } = services;
      if (!http) {
        throw new Error('HTTP service not available');
      }
      await http.post(ENDPOINT_ASSETS_ROUTES.TRANSFORM_START);
    },
    onSuccess: () => {
      refresh();
    },
  });

  // Mutation for stopping transform
  const stopMutation = useMutation({
    mutationFn: async () => {
      const { http } = services;
      if (!http) {
        throw new Error('HTTP service not available');
      }
      await http.post(ENDPOINT_ASSETS_ROUTES.TRANSFORM_STOP);
    },
    onSuccess: () => {
      refresh();
    },
  });

  const startTransform = useCallback(async () => {
    await startMutation.mutateAsync();
  }, [startMutation]);

  const stopTransform = useCallback(async () => {
    await stopMutation.mutateAsync();
  }, [stopMutation]);

  return {
    status: data ?? null,
    loading: isLoading,
    error: error as Error | null,
    refresh,
    startTransform,
    stopTransform,
    isStarting: startMutation.isPending,
    isStopping: stopMutation.isPending,
  };
};
