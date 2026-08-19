/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreStart } from '@kbn/core/public';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import { useQuery } from '@kbn/react-query';

export interface WorkflowListItem {
  id: string;
  name: string;
  description?: string;
  enabled?: boolean;
  managed?: boolean;
  tags?: string[];
}

interface WorkflowSearchResponse {
  results: Array<WorkflowListItem & { definition?: { tags?: string[] } | null }>;
  total: number;
}

/**
 * Lists managed + custom workflows via the Workflows management HTTP API. Mirrors the AD flyout's
 * `useListWorkflows` (http-only `GET /api/workflows`) so the validation / alert-retrieval selectors
 * show real workflows.
 */
export const useAdWorkflows = () => {
  const { services } = useKibana<CoreStart>();
  const { http } = services;

  return useQuery({
    queryKey: ['pnd', 'ad-worker-config', 'workflows'],
    queryFn: async () => {
      const response = await http.get<WorkflowSearchResponse>('/api/workflows', {
        query: { managed: 'all', page: 1, size: 1000 },
        version: '2023-10-31',
      });
      return response.results.map((r) => ({ ...r, tags: r.definition?.tags ?? r.tags }));
    },
  });
};
