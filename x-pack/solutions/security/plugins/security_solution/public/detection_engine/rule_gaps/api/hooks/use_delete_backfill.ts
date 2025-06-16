/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { UseMutationOptions } from '@tanstack/react-query';
import { useMutation } from '@tanstack/react-query';
import type { IHttpFetchError } from '@kbn/core-http-browser';
import { deleteBackfill } from '../api';
import { useInvalidateFindBackfillQuery } from './use_find_backfills_for_rules';
import { useInvalidateFindGapsQuery } from './use_find_gaps_for_rule';
export const DELETE_BACKFILL_MUTATION_KEY = ['POST', ' DELETE_BACKFILL_MUTATION_KEY'];

export const useDeleteBackfill = (
  options?: UseMutationOptions<
    unknown,
    IHttpFetchError<Error>,
    {
      backfillId: string;
    }
  >
) => {
  const invalidateBackfillQuery = useInvalidateFindBackfillQuery();
  const invalidateFindGapsQuery = useInvalidateFindGapsQuery();
  return useMutation(deleteBackfill, {
    ...options,
    mutationKey: DELETE_BACKFILL_MUTATION_KEY,
    onSettled: (...args) => {
      invalidateBackfillQuery();
      invalidateFindGapsQuery();
      if (options?.onSettled) {
        options.onSettled(...args);
      }
    },
  });
};
