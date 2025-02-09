/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { UseMutationOptions } from '@tanstack/react-query';
import { useMutation } from '@tanstack/react-query';
import type { IHttpFetchError } from '@kbn/core/public';
import { useInvalidateFindGapsQuery } from './use_find_gaps_for_rule';
import { useInvalidateFindBackfillQuery } from './use_find_backfills_for_rules';
import { fillGapByIdForRule } from '../api';

export const FILL_GAP_BY_ID_MUTATION_KEY = ['POST', 'FILL_GAP_BY_ID_MUTATION_KEY'];

interface FillGapQuery {
  ruleId: string;
  gapId: string;
}
export const useFillGapMutation = (
  options?: UseMutationOptions<unknown, IHttpFetchError<Error>, FillGapQuery>
) => {
  const invalidateFindGapsQuery = useInvalidateFindGapsQuery();
  const invalidateFindBackfillsQuery = useInvalidateFindBackfillQuery();
  return useMutation((fillGapsOptions: FillGapQuery) => fillGapByIdForRule(fillGapsOptions), {
    ...options,
    onSettled: (...args) => {
      invalidateFindGapsQuery();
      invalidateFindBackfillsQuery();
      if (options?.onSettled) {
        options.onSettled(...args);
      }
    },
    mutationKey: FILL_GAP_BY_ID_MUTATION_KEY,
  });
};
