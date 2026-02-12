/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Index } from '@kbn/index-management-shared-types';
import { useQuery } from '@kbn/react-query';
import { QueryKeys } from '../../constants';
import { useKibana } from '../use_kibana';

export const useIndex = (indexName: string) => {
  const { http } = useKibana().services;
  const queryKey = [QueryKeys.FetchIndex, indexName];
  return useQuery<Index, { body: { statusCode: number; message: string; error: string } }>({
    queryKey,
    refetchOnWindowFocus: 'always',
    retry: (failureCount, error) => {
      return !(error?.body?.statusCode === 404 || failureCount === 3);
    },
    queryFn: () =>
      http.fetch<Index>(`/internal/index_management/indices/${encodeURIComponent(indexName)}`),
  });
};
