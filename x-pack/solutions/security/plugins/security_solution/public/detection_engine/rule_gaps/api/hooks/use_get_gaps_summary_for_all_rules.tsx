/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { useCallback } from 'react';
import type { UseQueryOptions } from '@tanstack/react-query';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import type { GetGapsSummaryForAllRulesResponseBodyLatest } from '@kbn/alerting-plugin/common/routes/gaps/apis/get_gaps_summary_for_all_rules';
import { getGapsSummaryForAllRules } from '../api';
import type { GapRangeValue } from '../../constants';
import { getGapRange } from './utils';

const GET_GAPS_SUMMARY_FOR_ALL_RULES = ['GET_GAPS_SUMMARY_FOR_ALL_RULES'];

export const useInvalidateGetGapsSummaryForAllRulesQuery = () => {
  const queryClient = useQueryClient();

  return useCallback(() => {
    queryClient.invalidateQueries([GET_GAPS_SUMMARY_FOR_ALL_RULES], {
      refetchType: 'active',
    });
  }, [queryClient]);
};

export const useGetGapsSummaryForAllRules = (
  {
    gapRange,
  }: {
    gapRange: GapRangeValue;
  },
  options?: UseQueryOptions<GetGapsSummaryForAllRulesResponseBodyLatest>
) => {
  return useQuery<GetGapsSummaryForAllRulesResponseBodyLatest>(
    [GET_GAPS_SUMMARY_FOR_ALL_RULES, gapRange],
    async ({ signal }) => {
      const { start, end } = getGapRange(gapRange);
      const response = await getGapsSummaryForAllRules({
        signal,
        start,
        end,
      });

      return response;
    },
    {
      retry: 0,
      keepPreviousData: true,
      ...options,
    }
  );
};
