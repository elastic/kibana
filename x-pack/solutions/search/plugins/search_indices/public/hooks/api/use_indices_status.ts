/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useQuery } from '@tanstack/react-query';
import type { UseQueryResult } from '@tanstack/react-query';

import { GET_STATUS_ROUTE } from '../../../common/routes';
import type { IndicesStatusResponse } from '../../../common/types';
import { QueryKeys } from '../../constants';

import { useKibana } from '../use_kibana';

const DEFAULT_INDICES_POLLING_INTERVAL = 15 * 1000;

export const useIndicesStatusQuery = (
  pollingInterval = DEFAULT_INDICES_POLLING_INTERVAL
): UseQueryResult<IndicesStatusResponse> => {
  const { http } = useKibana().services;

  return useQuery({
    refetchInterval: pollingInterval,
    refetchIntervalInBackground: true,
    refetchOnWindowFocus: 'always',
    retry: true,
    queryKey: [QueryKeys.FetchSearchIndicesStatus],
    queryFn: () => http.get<IndicesStatusResponse>(GET_STATUS_ROUTE),
  });
};
