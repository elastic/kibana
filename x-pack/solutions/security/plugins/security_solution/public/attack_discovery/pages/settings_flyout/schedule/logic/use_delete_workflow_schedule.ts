/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMutation } from '@kbn/react-query';
import type { DeleteAttackDiscoveryScheduleResponse } from '@kbn/discoveries-schemas';

import * as i18n from './translations';
import { deleteWorkflowSchedule, INTERNAL_SCHEDULES_BY_ID } from '../api/internal';
import { useInvalidateGetWorkflowSchedule } from './use_get_workflow_schedule';
import { useInvalidateFindWorkflowSchedules } from './use_find_workflow_schedules';
import { useAppToasts } from '../../../../../common/hooks/use_app_toasts';

export const DELETE_WORKFLOW_SCHEDULE_MUTATION_KEY = ['DELETE', INTERNAL_SCHEDULES_BY_ID];

interface DeleteWorkflowScheduleParams {
  id: string;
}

/**
 * NOTE: Despite the "Workflow" in its name, this hook deletes an alerting rule (not a
 * workflow definition) via the internal API at `/internal/attack_discovery/schedules/{id}`.
 * The "workflow" prefix is a historical artifact; renaming is deferred to a follow-up PR
 * (Option C: Hybrid Scheduling Migration).
 */
export const useDeleteWorkflowSchedule = () => {
  const { addError, addSuccess } = useAppToasts();

  const invalidateGetWorkflowSchedule = useInvalidateGetWorkflowSchedule();
  const invalidateFindWorkflowSchedules = useInvalidateFindWorkflowSchedules();

  return useMutation<DeleteAttackDiscoveryScheduleResponse, Error, DeleteWorkflowScheduleParams>(
    ({ id }) => deleteWorkflowSchedule({ id }),
    {
      mutationKey: DELETE_WORKFLOW_SCHEDULE_MUTATION_KEY,
      onError: (error) => {
        addError(error, { title: i18n.DELETE_ATTACK_DISCOVERY_SCHEDULES_FAILURE() });
      },
      onSuccess: ({ id }) => {
        invalidateGetWorkflowSchedule(id);
        invalidateFindWorkflowSchedules();
        addSuccess(i18n.DELETE_ATTACK_DISCOVERY_SCHEDULES_SUCCESS());
      },
    }
  );
};
