/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useQuery } from '@tanstack/react-query';

import { QueryKeys } from '../../constants';
import { Mappings } from '../../types';
import { useKibana } from '../use_kibana';

const POLLING_INTERVAL = 15 * 1000;
export const useIndexMapping = (indexName: string) => {
  const { http } = useKibana().services;
  const queryKey = [QueryKeys.FetchMapping, indexName];
  return useQuery<Mappings, { body: { message: string; error: string } }>({
    queryKey,
    refetchInterval: POLLING_INTERVAL,
    refetchIntervalInBackground: true,
    refetchOnWindowFocus: 'always',
    queryFn: () =>
      http.fetch<Mappings>(`/api/index_management/mapping/${encodeURIComponent(indexName)}`),
  });
};
