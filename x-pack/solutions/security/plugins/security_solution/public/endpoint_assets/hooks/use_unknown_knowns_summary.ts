/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import type { UnknownKnownsSummaryResponse } from '../../../common/endpoint_assets';
import { ENDPOINT_ASSETS_ROUTES } from '../../../common/endpoint_assets';

const QUERY_KEY = 'endpoint-assets-unknown-knowns-summary';

interface UseUnknownKnownsSummaryResult {
  data: UnknownKnownsSummaryResponse | null;
  loading: boolean;
  error: Error | null;
  refresh: () => void;
}

export const useUnknownKnownsSummary = (): UseUnknownKnownsSummaryResult => {
  const { services } = useKibana();
  const queryClient = useQueryClient();

  const fetchUnknownKnownsSummary = useCallback(async (): Promise<UnknownKnownsSummaryResponse> => {
    const { http } = services;
    if (!http) {
      throw new Error('HTTP service not available');
    }

    const response = await http.get<UnknownKnownsSummaryResponse>(
      ENDPOINT_ASSETS_ROUTES.UNKNOWN_KNOWNS_SUMMARY
    );

    return response;
  }, [services]);

  const { data, isLoading, error } = useQuery({
    queryKey: [QUERY_KEY],
    queryFn: fetchUnknownKnownsSummary,
    staleTime: 60000,
    refetchOnWindowFocus: true,
  });

  const refresh = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
  }, [queryClient]);

  return {
    data: data ?? null,
    loading: isLoading,
    error: error as Error | null,
    refresh,
  };
};
