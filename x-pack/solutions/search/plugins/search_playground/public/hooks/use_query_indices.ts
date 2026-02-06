/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useQuery } from '@kbn/react-query';
import type { IndexName } from '@elastic/elasticsearch/lib/api/types';
import type { HttpSetup } from '@kbn/core/public';
import { SearchPlaygroundQueryKeys } from '../../common';
import { APIRoutes } from '../types';
import { useKibana } from './use_kibana';

export const IndicesQuery =
  (http: HttpSetup, query: string = '', exact: boolean = false) =>
  async () => {
    try {
      const response = await http.get<{
        indices: string[];
      }>(APIRoutes.GET_INDICES, {
        query: {
          search_query: query,
          exact,
          size: 100,
        },
      });

      return response.indices;
    } catch (err) {
      if (err?.response?.status === 404) {
        return [];
      }

      throw err;
    }
  };

export const useQueryIndices = (
  {
    query,
    exact,
  }: {
    query?: string;
    exact?: boolean;
  } = { query: '', exact: false }
): { indices: IndexName[]; isLoading: boolean; isFetched: boolean } => {
  const { services } = useKibana();

  const { data, isLoading, isFetched } = useQuery({
    queryKey: [SearchPlaygroundQueryKeys.QueryIndices, query],
    queryFn: IndicesQuery(services.http, query, exact),
    initialData: [],
  });

  return { indices: data, isLoading, isFetched };
};
