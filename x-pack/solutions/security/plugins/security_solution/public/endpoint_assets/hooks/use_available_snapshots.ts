/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import type { ListSnapshotsResponse, SnapshotInfo } from '../../../common/endpoint_assets';
import { ENDPOINT_ASSETS_ROUTES } from '../../../common/endpoint_assets';

const QUERY_KEY = 'endpoint-assets-available-snapshots';

interface UseAvailableSnapshotsResult {
  snapshots: SnapshotInfo[];
  loading: boolean;
  error: Error | null;
  refresh: () => void;
}

export const useAvailableSnapshots = (): UseAvailableSnapshotsResult => {
  const { services } = useKibana();
  const queryClient = useQueryClient();

  const fetchSnapshots = useCallback(async (): Promise<SnapshotInfo[]> => {
    const { http } = services;
    if (!http) {
      throw new Error('HTTP service not available');
    }

    const response = await http.get<ListSnapshotsResponse>(ENDPOINT_ASSETS_ROUTES.SNAPSHOT_LIST);

    return response.snapshots;
  }, [services]);

  const { data, isLoading, error } = useQuery({
    queryKey: [QUERY_KEY],
    queryFn: fetchSnapshots,
    staleTime: 60000, // 1 minute - snapshots don't change frequently
    refetchOnWindowFocus: false,
  });

  const refresh = useCallback(() => {
    queryClient.invalidateQueries({
      queryKey: [QUERY_KEY],
    });
  }, [queryClient]);

  return {
    snapshots: data ?? [],
    loading: isLoading,
    error: error as Error | null,
    refresh,
  };
};
