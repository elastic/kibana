/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback } from 'react';
import { useQuery, useQueryClient } from '@kbn/react-query';
import { useKibana } from '../../../../../../common/lib/kibana';

export const WORKFLOWS_QUERY_KEY = ['attack_discovery', 'workflows', 'list'];

interface WorkflowSearchResult {
  description: string;
  enabled: boolean;
  id: string;
  name: string;
  tags?: string[];
}

interface WorkflowSearchResponse {
  results: WorkflowSearchResult[];
  total: number;
}

export const useListWorkflows = () => {
  const { http } = useKibana().services;

  const result = useQuery({
    enabled: !!http,
    queryFn: async () => {
      if (!http) {
        throw new Error('HTTP service not available');
      }
      return http.get<WorkflowSearchResponse>('/api/workflows', {
        query: {
          page: 1,
          size: 10000,
        },
        version: '2023-10-31',
      });
    },
    queryKey: WORKFLOWS_QUERY_KEY,
    refetchOnWindowFocus: true,
  });

  return {
    ...result,
    data: result.data?.results,
  };
};

/**
 * Returns a callback that invalidates the list workflows query cache,
 * causing the workflow list to refetch.
 */
export const useInvalidateListWorkflows = () => {
  const queryClient = useQueryClient();

  return useCallback(() => {
    queryClient.invalidateQueries(WORKFLOWS_QUERY_KEY, {
      refetchType: 'all',
    });
  }, [queryClient]);
};
