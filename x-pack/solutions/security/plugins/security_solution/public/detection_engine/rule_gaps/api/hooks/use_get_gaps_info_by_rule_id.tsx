/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { GetGapsInfoByRuleIdsResponseBody } from '@kbn/alerting-plugin/common/routes/gaps/apis/get_gaps_info_by_rule_ids';
import type { UseQueryOptions } from '@tanstack/react-query';
import { useQuery } from '@tanstack/react-query';
import { getGapsInfoByRuleIds } from '../api';
import type { GapRangeValue } from '../../constants';
import { getGapRange } from './utils';
const GET_GAPS_INFO_BY_RULE_IDS = ['GET_GAPS_INFO_BY_RULE_IDS'];
export const useGetGapsInfoByRuleIds = (
  {
    gapRange,
    ruleIds,
  }: {
    gapRange: GapRangeValue;
    ruleIds: string[];
  },
  options?: UseQueryOptions<GetGapsInfoByRuleIdsResponseBody>
) => {
  return useQuery<GetGapsInfoByRuleIdsResponseBody>(
    [...GET_GAPS_INFO_BY_RULE_IDS, ...ruleIds, gapRange],
    async ({ signal }) => {
      const { start, end } = getGapRange(gapRange);
      const response = await getGapsInfoByRuleIds({ signal, start, end, ruleIds });

      return response;
    },
    {
      retry: 0,
      keepPreviousData: true,
      ...options,
    }
  );
};
