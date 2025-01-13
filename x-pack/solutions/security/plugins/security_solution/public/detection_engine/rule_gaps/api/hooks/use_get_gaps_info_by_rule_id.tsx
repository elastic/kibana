/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { GetGapsInfoByRuleIdsResponseBody } from '@kbn/alerting-plugin/common/routes/gaps/apis/get_rules_with_gaps';
import type { UseQueryOptions } from '@tanstack/react-query';
import { useQuery } from '@tanstack/react-query';
import { getGapsInfoByRuleIds } from '../api';

const GET_GAPS_INFO_BY_RULE_IDS = ['GET_GAPS_INFO_BY_RULE_IDS'];
export const useGetGapsInfoByRuleIds = (
  {
    start,
    end,
    ruleIds,
  }: {
    start: string;
    end: string;
    ruleIds: string[];
  },
  options?: UseQueryOptions<GetGapsInfoByRuleIdsResponseBody>
) => {
  return useQuery<GetGapsInfoByRuleIdsResponseBody>(
    [...GET_GAPS_INFO_BY_RULE_IDS, ...ruleIds, start, end],
    async ({ signal }) => {
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
