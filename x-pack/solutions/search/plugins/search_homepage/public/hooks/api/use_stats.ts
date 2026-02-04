/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { UseQueryResult } from '@kbn/react-query';
import { useQuery } from '@kbn/react-query';
import type { StatsResponse } from '../../../server/types';
import { useKibana } from '../use_kibana';

export interface SizeStats {
  documents: StatsResponse['sizeStats']['documents'];
  size: StatsResponse['sizeStats']['size'];
}

export const useStats = (): UseQueryResult<SizeStats> => {
  const { http } = useKibana().services;

  const queryResult = useQuery<SizeStats, Error>({
    queryKey: ['fetchSizeStats'],
    queryFn: async () => {
      const response = await http.get<StatsResponse>('/internal/search_homepage/stats');
      return {
        documents: response.sizeStats.documents,
        size: response.sizeStats.size,
      };
    },
  });

  return queryResult;
};
