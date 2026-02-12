/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useKibana } from '@kbn/kibana-react-plugin/public';
import type { CoreStart } from '@kbn/core/public';
import { useQuery } from '@kbn/react-query';
import type { CasesSearchResponse } from './types';

export const useSiemReadinessGetCasesCountByTags = (tags: string[]) => {
  const { http } = useKibana<CoreStart>().services;

  return useQuery({
    queryKey: ['siem-readiness', 'cases-search', ...tags] as const,
    queryFn: () => {
      return http.fetch<CasesSearchResponse>('/internal/cases/_search', {
        method: 'POST',
        body: JSON.stringify({
          owner: ['securitySolution'],
          tags,
          page: 1,
          perPage: 100,
          sortField: 'createdAt',
          sortOrder: 'desc',
        }),
      });
    },
    enabled: tags.length > 0, // Only run query if tags are provided
  });
};
