/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useQuery } from '@tanstack/react-query';
import { APIRoutes } from '../../common/api_routes';
import { useKibana } from './use_kibana';

export const useFetchIndexNames = (searchQuery: string) => {
  const {
    services: { http },
  } = useKibana();

  return useQuery({
    queryKey: ['fetchIndexNames', searchQuery],
    queryFn: async () => {
      const response = await http.get<string[]>(APIRoutes.FETCH_INDICES, {
        ...(searchQuery.trim() === ''
          ? {}
          : {
              query: {
                searchQuery,
              },
            }),
      });
      return response;
    },
    refetchOnWindowFocus: false,
    retry: false,
  });
};
