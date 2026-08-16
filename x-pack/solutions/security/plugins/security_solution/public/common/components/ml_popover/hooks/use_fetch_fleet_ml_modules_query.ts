/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { UseQueryOptions } from '@kbn/react-query';
import { useQuery, useQueryClient } from '@kbn/react-query';
import { useCallback } from 'react';
import { getFleetMlModules } from '../api';
import type { Module } from '../types';

const ONE_MINUTE = 60000;
export const GET_FLEET_ML_MODULES_QUERY_KEY = ['GET', '/api/saved_objects/_find', 'ml-module'];

export const useFetchFleetMlModulesQuery = (options?: UseQueryOptions<Module[]>) => {
  return useQuery<Module[]>(
    GET_FLEET_ML_MODULES_QUERY_KEY,
    async ({ signal }) => getFleetMlModules({ signal }),
    {
      refetchIntervalInBackground: false,
      staleTime: ONE_MINUTE * 5,
      retry: false,
      ...options,
    }
  );
};

export const useInvalidateFetchFleetMlModulesQuery = () => {
  const queryClient = useQueryClient();

  return useCallback(() => {
    queryClient.invalidateQueries(GET_FLEET_ML_MODULES_QUERY_KEY, { refetchType: 'active' });
  }, [queryClient]);
};
