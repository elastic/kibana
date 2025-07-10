/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { UseQueryOptions } from '@tanstack/react-query';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback } from 'react';
import type { FindGapsResponseBody } from '@kbn/alerting-plugin/common/routes/gaps/apis/find';
import { findGapsForRule } from '../api';
import type { GapStatus } from '../../types';

const FIND_GAPS_FOR_RULE = 'FIND_GAP_FOR_RULE';

export const useInvalidateFindGapsQuery = () => {
  const queryClient = useQueryClient();

  return useCallback(() => {
    queryClient.invalidateQueries([FIND_GAPS_FOR_RULE], {
      refetchType: 'active',
    });
  }, [queryClient]);
};

export const useFindGapsForRule = (
  {
    ruleId,
    page,
    perPage,
    start,
    end,
    statuses,
    sortField,
    sortOrder,
  }: {
    ruleId: string;
    page: number;
    perPage: number;
    start: string;
    end: string;
    statuses: GapStatus[];
    sortField: string;
    sortOrder: string;
  },
  options?: UseQueryOptions<FindGapsResponseBody>
) => {
  return useQuery<FindGapsResponseBody>(
    [
      FIND_GAPS_FOR_RULE,
      ruleId,
      page,
      perPage,
      statuses?.join(','),
      sortField,
      sortOrder,
      start,
      end,
    ],
    async ({ signal }) => {
      const response = await findGapsForRule({
        signal,
        ruleId,
        page,
        perPage,
        start,
        end,
        statuses,
        sortField: sortField as string,
        sortOrder,
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
