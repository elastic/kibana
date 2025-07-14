/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useQuery } from '@tanstack/react-query';

import { ROUTE_VERSIONS } from '../../common';
import { APIRoutes, PlaygroundListResponse } from '../types';
import { useKibana } from './use_kibana';

export interface UsePlaygroundsListParameters {
  page: number;
  sortField: 'name' | 'updated_at';
  sortOrder: 'asc' | 'desc';
}

export const usePlaygroundsList = ({
  page,
  sortField,
  sortOrder,
}: UsePlaygroundsListParameters) => {
  const { http } = useKibana().services;

  return useQuery({
    queryKey: ['playgroundsList', page, sortField, sortOrder],
    queryFn: async () =>
      http.get<PlaygroundListResponse>(APIRoutes.GET_PLAYGROUNDS, {
        query: { page, sortField, sortOrder },
        version: ROUTE_VERSIONS.v1,
      }),
  });
};
