/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { GetGapsSummaryByRuleIdsResponseBody } from '@kbn/alerting-plugin/common/routes/gaps/apis/get_gaps_summary_by_rule_ids';
import type { UseQueryOptions } from '@tanstack/react-query';
import { useQuery } from '@tanstack/react-query';
import { getGapsSummaryByRuleIds } from '../api';
import type { GapRangeValue } from '../../constants';
import { getGapRange } from './utils';
const GET_GAPS_SUMMARY_BY_RULE_IDS = ['GET_GAPS_SUMMARY_BY_RULE_IDS'];

export const useGetGapsSummaryByRuleIds = (
  {
    gapRange,
    ruleIds,
  }: {
    gapRange: GapRangeValue;
    ruleIds: string[];
  },
  options?: UseQueryOptions<GetGapsSummaryByRuleIdsResponseBody>
) => {
  return useQuery<GetGapsSummaryByRuleIdsResponseBody>(
    [...GET_GAPS_SUMMARY_BY_RULE_IDS, ...ruleIds, gapRange],
    async ({ signal }) => {
      const { start, end } = getGapRange(gapRange);
      const response = await getGapsSummaryByRuleIds({ signal, start, end, ruleIds });

      return response;
    },
    {
      retry: 0,
      keepPreviousData: true,
      ...options,
    }
  );
};
