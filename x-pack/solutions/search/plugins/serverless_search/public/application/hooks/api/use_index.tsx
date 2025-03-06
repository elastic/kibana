/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useQuery } from '@tanstack/react-query';

import { FetchIndexResult } from '../../../../common/types';
import { useKibanaServices } from '../use_kibana';

export const useIndex = (id: string) => {
  const { http } = useKibanaServices();
  const queryKey = ['fetchIndex', id];
  const result = useQuery({
    queryKey,
    queryFn: () => http.fetch<FetchIndexResult>(`/internal/serverless_search/index/${id}`),
  });
  return { queryKey, ...result };
};
