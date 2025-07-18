/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useQuery } from '@tanstack/react-query';

import { SearchPlaygroundQueryKeys } from '../../common';
import { APIRoutes, IndicesQuerySourceFields } from '../types';
import { useKibana } from './use_kibana';

const initialData = {};

export const useIndicesFields = (indices: string[] = []) => {
  const { services } = useKibana();

  const { data, isLoading, isFetching, isFetched } = useQuery<IndicesQuerySourceFields>({
    enabled: indices.length > 0,
    queryKey: [SearchPlaygroundQueryKeys.IndicesFields, indices.toString()],
    initialData,
    queryFn: () =>
      services.http.post<IndicesQuerySourceFields>(APIRoutes.POST_QUERY_SOURCE_FIELDS, {
        body: JSON.stringify({
          indices,
        }),
      }),
  });
  return { fields: data, isFetched, isLoading: isLoading || isFetching };
};
