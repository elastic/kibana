/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { UseQueryOptions } from '@tanstack/react-query';
import { useQuery } from '@tanstack/react-query';
import type { GetGlobalExecutionSummaryResponseBodyV1 } from '@kbn/alerting-plugin/common/routes/rule/apis/global_execution_summary';
import { getGlobalRuleExecutionSummary } from '../api';
import type { GapRangeValue } from '../../constants';
import { getGapRange } from './utils';

export const GET_GLOBAL_RULE_EXECUTION_SUMMARY = ['GET_GLOBAL_RULE_EXECUTION_SUMMARY'];

export const useGetGlobalRuleExecutionSummary = (
  {
    range,
  }: {
    range: GapRangeValue;
  },
  options?: UseQueryOptions<GetGlobalExecutionSummaryResponseBodyV1>
) => {
  return useQuery<GetGlobalExecutionSummaryResponseBodyV1>(
    [GET_GLOBAL_RULE_EXECUTION_SUMMARY, range],
    async ({ signal }) => {
      const { start, end } = getGapRange(range);
      return getGlobalRuleExecutionSummary({ signal, start, end });
    },
    {
      retry: 0,
      keepPreviousData: true,
      ...options,
    }
  );
};
