/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMutation } from '@kbn/react-query';
import type { DisableAttackDiscoveryScheduleResponse } from '@kbn/discoveries-schemas';

import * as i18n from './translations';
import { disableWorkflowSchedule, INTERNAL_SCHEDULES_DISABLE } from '../api/internal';
import { useInvalidateGetWorkflowSchedule } from './use_get_workflow_schedule';
import { useInvalidateFindWorkflowSchedules } from './use_find_workflow_schedules';
import { useAppToasts } from '../../../../../common/hooks/use_app_toasts';

export const DISABLE_WORKFLOW_SCHEDULE_MUTATION_KEY = ['POST', INTERNAL_SCHEDULES_DISABLE];

interface DisableWorkflowScheduleParams {
  id: string;
}

/**
 * NOTE: Despite the "Workflow" in its name, this hook disables an alerting rule (not a
 * workflow definition) via the internal API at `/internal/attack_discovery/schedules/{id}/_disable`.
 * The "workflow" prefix is a historical artifact; renaming is deferred to a follow-up PR
 * (Option C: Hybrid Scheduling Migration).
 */
export const useDisableWorkflowSchedule = () => {
  const { addError, addSuccess } = useAppToasts();

  const invalidateGetWorkflowSchedule = useInvalidateGetWorkflowSchedule();
  const invalidateFindWorkflowSchedules = useInvalidateFindWorkflowSchedules();

  return useMutation<DisableAttackDiscoveryScheduleResponse, Error, DisableWorkflowScheduleParams>(
    ({ id }) => disableWorkflowSchedule({ id }),
    {
      mutationKey: DISABLE_WORKFLOW_SCHEDULE_MUTATION_KEY,
      onError: (error) => {
        addError(error, { title: i18n.DISABLE_ATTACK_DISCOVERY_SCHEDULES_FAILURE() });
      },
      onSuccess: ({ id }) => {
        invalidateGetWorkflowSchedule(id);
        invalidateFindWorkflowSchedules();
        addSuccess(i18n.DISABLE_ATTACK_DISCOVERY_SCHEDULES_SUCCESS());
      },
    }
  );
};
