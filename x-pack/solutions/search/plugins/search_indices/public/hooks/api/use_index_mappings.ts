/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useQuery } from '@kbn/react-query';
import { useKibana } from '../use_kibana';
import type { Mappings } from '../../types';
import { QueryKeys } from '../../constants';

export const useIndexMapping = (indexName: string) => {
  const { http } = useKibana().services;
  const queryKey = [QueryKeys.FetchMapping, indexName];
  return useQuery<Mappings, { body: { message: string; error: string } }>({
    queryKey,
    refetchOnWindowFocus: 'always',
    queryFn: () =>
      http.fetch<Mappings>(`/api/index_management/mapping/${encodeURIComponent(indexName)}`),
  });
};
