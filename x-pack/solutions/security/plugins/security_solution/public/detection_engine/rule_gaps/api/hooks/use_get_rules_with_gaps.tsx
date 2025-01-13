/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { GetRulesWithGapResponseBody } from '@kbn/alerting-plugin/common/routes/gaps/apis/get_rules_with_gaps';
import type { UseQueryOptions } from '@tanstack/react-query';
import { useQuery } from '@tanstack/react-query';
import { getRulesWithGaps } from '../api';

const GET_RULES_WITH_GAPS = ['GET_RULES_WITH_GAPS'];
export const useGetRulesWithGaps = (
  {
    start,
    end,
  }: {
    start: string;
    end: string;
  },
  options?: UseQueryOptions<GetRulesWithGapResponseBody>
) => {
  return useQuery<GetRulesWithGapResponseBody>(
    [GET_RULES_WITH_GAPS, start, end],
    async ({ signal }) => {
      const response = await getRulesWithGaps({ signal, start, end });

      return response;
    },
    {
      retry: 0,
      keepPreviousData: true,
      ...options,
    }
  );
};
