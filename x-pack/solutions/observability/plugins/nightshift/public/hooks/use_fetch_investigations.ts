/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useQuery, type UseQueryResult } from '@kbn/react-query';
import type { ListInvestigationsResponse } from '@kbn/nightshift-investigations-plugin/common';
import { useKibana } from './use_kibana';

export const NIGHTSHIFT_INVESTIGATIONS_QUERY_KEY = ['nightshift.investigations'] as const;

export const useFetchInvestigations = (): UseQueryResult<ListInvestigationsResponse, Error> => {
  const { http } = useKibana().services;

  return useQuery<ListInvestigationsResponse, Error>({
    queryKey: NIGHTSHIFT_INVESTIGATIONS_QUERY_KEY,
    queryFn: async ({ signal }) => {
      return http.get<ListInvestigationsResponse>('/internal/nightshift/investigations', {
        signal: signal ?? undefined,
      });
    },
  });
};
