/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useState, useEffect } from 'react';
import { useKibana } from '../../../../common/lib/kibana';

interface RemoteCluster {
  name: string;
  isConnected?: boolean;
  mode?: string;
}

interface UseRemoteClustersReturn {
  clusters: Array<{ label: string; isConnected: boolean }>;
  isLoading: boolean;
  error: string | undefined;
}

export const useRemoteClusters = (): UseRemoteClustersReturn => {
  const { http } = useKibana().services;
  const [clusters, setClusters] = useState<Array<{ label: string; isConnected: boolean }>>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | undefined>();

  useEffect(() => {
    let cancelled = false;

    const fetchClusters = async () => {
      setIsLoading(true);
      setError(undefined);
      try {
        const response = await http.get<RemoteCluster[]>('/api/remote_clusters');
        if (!cancelled) {
          setClusters(
            response.map((cluster) => ({
              label: cluster.name,
              isConnected: cluster.isConnected ?? false,
            }))
          );
        }
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : 'Failed to fetch remote clusters');
          setClusters([]);
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    };

    fetchClusters();
    return () => {
      cancelled = true;
    };
  }, [http]);

  return { clusters, isLoading, error };
};
