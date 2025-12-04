/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { UseQueryResult } from '@kbn/react-query';
import { useQuery } from '@kbn/react-query';
import { useKibana } from '../use_kibana';

export const useStats = (): UseQueryResult => {
  const { http } = useKibana().services;

  const queryResult = useQuery({
    queryKey: ['fetchStats'],
    queryFn: async () => {
      const response = await http.get('/internal/search_homepage/stats');
      return response;
    },
  });

  return {
    ...queryResult,
  };
};
