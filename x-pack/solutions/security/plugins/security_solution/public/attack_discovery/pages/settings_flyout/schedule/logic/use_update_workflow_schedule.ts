/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMutation, useQueryClient } from '@kbn/react-query';
import type {
  AttackDiscoveryScheduleUpdateProps,
  UpdateAttackDiscoveryScheduleResponse,
} from '@kbn/discoveries-schemas';

import * as i18n from './translations';
import { updateWorkflowSchedule, INTERNAL_SCHEDULES_BY_ID } from '../api/internal';
import { useInvalidateGetWorkflowSchedule } from './use_get_workflow_schedule';
import { useInvalidateFindWorkflowSchedules } from './use_find_workflow_schedules';
import { transformAttackDiscoveryScheduleToAttackDiscoverySchedule } from './transform_attack_discovery_schedule';
import { useAppToasts } from '../../../../../common/hooks/use_app_toasts';

export const UPDATE_WORKFLOW_SCHEDULE_MUTATION_KEY = ['PUT', INTERNAL_SCHEDULES_BY_ID];

const replaceId = (template: string, id: string): string => template.replace('{id}', id);

interface UpdateWorkflowScheduleParams {
  id: string;
  scheduleToUpdate: AttackDiscoveryScheduleUpdateProps;
}

/**
 * NOTE: Despite the "Workflow" in its name, this hook updates an alerting rule (not a
 * workflow definition) via the internal API at `/internal/attack_discovery/schedules/{id}`.
 * The "workflow" prefix is a historical artifact; renaming is deferred to a follow-up PR
 * (Option C: Hybrid Scheduling Migration).
 */
export const useUpdateWorkflowSchedule = () => {
  const { addError, addSuccess } = useAppToasts();

  const queryClient = useQueryClient();
  const invalidateGetWorkflowSchedule = useInvalidateGetWorkflowSchedule();
  const invalidateFindWorkflowSchedules = useInvalidateFindWorkflowSchedules();

  return useMutation<UpdateAttackDiscoveryScheduleResponse, Error, UpdateWorkflowScheduleParams>(
    ({ id, scheduleToUpdate }) =>
      updateWorkflowSchedule({
        body: scheduleToUpdate,
        id,
      }),
    {
      mutationKey: UPDATE_WORKFLOW_SCHEDULE_MUTATION_KEY,
      onError: (error) => {
        addError(error, { title: i18n.UPDATE_ATTACK_DISCOVERY_SCHEDULES_FAILURE() });
      },
      onSuccess: (updatedSchedule, { id }) => {
        // Work around eventual consistency: re-fetching the schedule immediately after an update
        // can return stale data (the underlying rules index has not refreshed yet), which then
        // gets cached as fresh and persists until a full page refresh. The update response is
        // authoritative, so write it directly into the get-by-id cache. This makes the details
        // flyout reflect the change instantly and avoids a refetch that would clobber it with
        // stale data.
        let cached = false;
        try {
          const schedule =
            transformAttackDiscoveryScheduleToAttackDiscoverySchedule(updatedSchedule);
          const specificPath = replaceId(INTERNAL_SCHEDULES_BY_ID, schedule.id);
          queryClient.setQueryData(['GET', specificPath, { id: schedule.id }], { schedule });
          cached = true;
        } catch {
          // If the update API returns an unexpected shape, skip the optimistic cache update and
          // fall back to invalidation so the next fetch reconciles the cache.
          cached = false;
        }

        if (!cached) {
          invalidateGetWorkflowSchedule(id);
        }
        invalidateFindWorkflowSchedules();
        addSuccess(i18n.UPDATE_ATTACK_DISCOVERY_SCHEDULES_SUCCESS());
      },
    }
  );
};
