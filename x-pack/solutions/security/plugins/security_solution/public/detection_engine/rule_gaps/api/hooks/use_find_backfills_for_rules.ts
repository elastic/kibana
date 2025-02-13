/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { UseQueryOptions } from '@tanstack/react-query';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import type { FindBackfillResponseBody } from '@kbn/alerting-plugin/common/routes/backfill/apis/find';
import { useCallback } from 'react';
import { findBackfillsForRules } from '../api';

const FIND_BACKFILLS_FOR_RULES = 'FIND_BACKFILLS_FOR_RULES';

export const useInvalidateFindBackfillQuery = () => {
  const queryClient = useQueryClient();

  return useCallback(() => {
    queryClient.invalidateQueries([FIND_BACKFILLS_FOR_RULES], {
      refetchType: 'active',
    });
  }, [queryClient]);
};

export const useFindBackfillsForRules = (
  {
    ruleIds,
    page,
    perPage,
  }: {
    ruleIds: string[];
    page: number;
    perPage: number;
  },
  options?: UseQueryOptions<FindBackfillResponseBody>
) => {
  return useQuery<FindBackfillResponseBody>(
    [FIND_BACKFILLS_FOR_RULES, ...ruleIds, page, perPage],
    async ({ signal }) => {
      const response = await findBackfillsForRules({ signal, ruleIds, page, perPage });

      return response;
    },
    {
      retry: 0,
      keepPreviousData: true,
      ...options,
    }
  );
};
