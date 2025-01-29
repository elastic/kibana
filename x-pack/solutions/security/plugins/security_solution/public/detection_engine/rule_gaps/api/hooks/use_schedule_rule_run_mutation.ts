/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { INTERNAL_ALERTING_BACKFILL_SCHEDULE_API_PATH } from '@kbn/alerting-plugin/common';
import type { UseMutationOptions } from '@tanstack/react-query';
import { useMutation } from '@tanstack/react-query';
import type { ScheduleBackfillProps } from '../../types';
import { scheduleRuleRun } from '../api';
import { useInvalidateFindBackfillQuery } from './use_find_backfills_for_rules';
import { useInvalidateFindGapsQuery } from './use_find_gaps_for_rule';

export const SCHEDULE_RULE_RUN_MUTATION_KEY = [
  'POST',
  INTERNAL_ALERTING_BACKFILL_SCHEDULE_API_PATH,
];

export const useScheduleRuleRunMutation = (
  options?: UseMutationOptions<unknown, Error, ScheduleBackfillProps>
) => {
  const invalidateBackfillQuery = useInvalidateFindBackfillQuery();
  const invalidateFindGapsQuery = useInvalidateFindGapsQuery();
  return useMutation((scheduleOptions: ScheduleBackfillProps) => scheduleRuleRun(scheduleOptions), {
    ...options,
    onSettled: (...args) => {
      invalidateBackfillQuery();
      invalidateFindGapsQuery();
      if (options?.onSettled) {
        options.onSettled(...args);
      }
    },
    mutationKey: SCHEDULE_RULE_RUN_MUTATION_KEY,
  });
};
