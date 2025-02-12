/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { GetRuleIdsWithGapResponseBody } from '@kbn/alerting-plugin/common/routes/gaps/apis/get_rules_with_gaps';
import type { UseQueryOptions } from '@tanstack/react-query';
import { useQuery } from '@tanstack/react-query';
import { getRuleIdsWithGaps } from '../api';
import type { GapRangeValue } from '../../constants';
import { getGapRange } from './utils';

const GET_RULE_IDS_WITH_GAPS = ['GET_RULE_IDS_WITH_GAPS'];

export const useGetRuleIdsWithGaps = (
  {
    gapRange,
    statuses,
  }: {
    gapRange: GapRangeValue;
    statuses: string[];
  },
  options?: UseQueryOptions<GetRuleIdsWithGapResponseBody>
) => {
  return useQuery<GetRuleIdsWithGapResponseBody>(
    [GET_RULE_IDS_WITH_GAPS, gapRange, ...statuses],
    async ({ signal }) => {
      const { start, end } = getGapRange(gapRange);
      const response = await getRuleIdsWithGaps({ signal, start, end, statuses });

      return response;
    },
    {
      retry: 0,
      keepPreviousData: true,
      ...options,
    }
  );
};
