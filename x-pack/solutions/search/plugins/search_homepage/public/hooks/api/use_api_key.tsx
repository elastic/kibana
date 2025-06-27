/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useQuery } from '@tanstack/react-query';
import type { ApiKeysResponse } from '../../../common/types';
import { useKibana } from '../use_kibana';
import { GET_API_KEYS_ROUTE } from '../../../common/routes';
import { QueryKeys } from '../../constants';

export const useGetApiKeys = () => {
  const { http } = useKibana().services;
  return useQuery({
    queryKey: [QueryKeys.ApiKey],
    queryFn: () => http.fetch<ApiKeysResponse>(GET_API_KEYS_ROUTE),
  });
};
