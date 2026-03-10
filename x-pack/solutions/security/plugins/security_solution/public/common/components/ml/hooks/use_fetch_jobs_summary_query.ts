/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { MlSummaryJob } from '@kbn/ml-plugin/public';
import type { UseQueryOptions } from '@kbn/react-query';
import { useQuery, useQueryClient } from '@kbn/react-query';
import { useCallback } from 'react';
import type { GetJobsSummaryArgs } from '../api/get_jobs_summary';
import { getJobsSummary } from '../api/get_jobs_summary';

const ONE_MINUTE = 60000;
export const GET_JOBS_SUMMARY_QUERY_KEY = ['POST', '/api/ml/jobs/jobs_summary'];

export const useFetchJobsSummaryQuery = (
  queryArgs: Omit<GetJobsSummaryArgs, 'signal'>,
  options?: UseQueryOptions<MlSummaryJob[]>
) => {
  return useQuery<MlSummaryJob[]>(
    [GET_JOBS_SUMMARY_QUERY_KEY, queryArgs],
    async ({ signal }) => getJobsSummary({ signal, ...queryArgs }),
    {
      refetchIntervalInBackground: false,
      staleTime: ONE_MINUTE * 5,
      retry: false,
      ...options,
    }
  );
};

export const useInvalidateFetchJobsSummaryQuery = () => {
  const queryClient = useQueryClient();

  return useCallback(() => {
    queryClient.invalidateQueries(GET_JOBS_SUMMARY_QUERY_KEY, {
      refetchType: 'active',
    });
  }, [queryClient]);
};
