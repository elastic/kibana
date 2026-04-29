/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useQuery } from '@kbn/react-query';
import type { TrialUsageResponse } from '../../../server/types';
import { useKibana } from '../use_kibana';

export type TrialUsageData = TrialUsageResponse;

export const useTrialUsageData = () => {
  const { http } = useKibana().services;

  return useQuery<TrialUsageData, Error>({
    queryKey: ['fetchTrialUsageData'],
    queryFn: () => http.get<TrialUsageResponse>('/internal/search_homepage/trial_usage'),
    staleTime: 5 * 60 * 1000,
    retry: 1,
  });
};
