/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import type { SnapshotCompareResponse } from '../../../common/endpoint_assets';
import { ENDPOINT_ASSETS_ROUTES } from '../../../common/endpoint_assets';

const QUERY_KEY = 'endpoint-assets-snapshot-compare';

interface UseSnapshotCompareOptions {
  dateA: string | null;
  dateB: string | null;
  hostId?: string;
  showOnlyChanges?: boolean;
  namespace?: string;
}

interface UseSnapshotCompareResult {
  data: SnapshotCompareResponse | null;
  loading: boolean;
  error: Error | null;
  refresh: () => void;
}

export const useSnapshotCompare = (
  options: UseSnapshotCompareOptions
): UseSnapshotCompareResult => {
  const {
    dateA,
    dateB,
    hostId = '',
    showOnlyChanges = true,
    namespace = 'default',
  } = options;
  const { services } = useKibana();
  const queryClient = useQueryClient();

  const fetchComparison = useCallback(async (): Promise<SnapshotCompareResponse> => {
    const { http } = services;
    if (!http) {
      throw new Error('HTTP service not available');
    }

    if (!dateA || !dateB) {
      throw new Error('Both dates must be selected');
    }

    const response = await http.get<SnapshotCompareResponse>(
      ENDPOINT_ASSETS_ROUTES.SNAPSHOT_COMPARE,
      {
        query: {
          date_a: dateA,
          date_b: dateB,
          host_id: hostId || undefined,
          show_only_changes: showOnlyChanges,
          namespace,
        },
      }
    );

    return response;
  }, [services, dateA, dateB, hostId, showOnlyChanges, namespace]);

  const { data, isLoading, error } = useQuery({
    queryKey: [QUERY_KEY, dateA, dateB, hostId, showOnlyChanges, namespace],
    queryFn: fetchComparison,
    enabled: !!dateA && !!dateB, // Only fetch when both dates are selected
    staleTime: 30000,
    refetchOnWindowFocus: false,
  });

  const refresh = useCallback(() => {
    queryClient.invalidateQueries({
      queryKey: [QUERY_KEY, dateA, dateB, hostId, showOnlyChanges, namespace],
    });
  }, [queryClient, dateA, dateB, hostId, showOnlyChanges, namespace]);

  return {
    data: data ?? null,
    loading: isLoading,
    error: error as Error | null,
    refresh,
  };
};
