/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMutation, useQueryClient } from '@kbn/react-query';
import type {
  CreateAttackDiscoveryScheduleResponse,
  AttackDiscoveryScheduleCreateProps,
} from '@kbn/discoveries-schemas';

import * as i18n from './translations';

interface FindSchedulesResponse {
  schedules?: Array<{ id: string }>;
  total?: number;
}
import {
  createWorkflowSchedule,
  INTERNAL_SCHEDULES,
  INTERNAL_SCHEDULES_FIND,
} from '../api/internal';
import { useInvalidateFindWorkflowSchedules } from './use_find_workflow_schedules';
import { useAppToasts } from '../../../../../common/hooks/use_app_toasts';
import { transformAttackDiscoveryScheduleToAttackDiscoverySchedule } from './transform_attack_discovery_schedule';

export const CREATE_WORKFLOW_SCHEDULE_MUTATION_KEY = ['POST', INTERNAL_SCHEDULES];

interface CreateWorkflowScheduleParams {
  scheduleToCreate: AttackDiscoveryScheduleCreateProps;
}

/**
 * NOTE: Despite the "Workflow" in its name, this hook creates an alerting rule (not a
 * workflow definition) via the internal API at `/internal/attack_discovery/schedules`.
 * The "workflow" prefix is a historical artifact; renaming is deferred to a follow-up PR
 * (Option C: Hybrid Scheduling Migration).
 */
export const useCreateWorkflowSchedule = () => {
  const { addError, addSuccess } = useAppToasts();

  const queryClient = useQueryClient();
  const invalidateFindWorkflowSchedules = useInvalidateFindWorkflowSchedules();

  return useMutation<CreateAttackDiscoveryScheduleResponse, Error, CreateWorkflowScheduleParams>(
    ({ scheduleToCreate }) => createWorkflowSchedule({ body: scheduleToCreate }),
    {
      mutationKey: CREATE_WORKFLOW_SCHEDULE_MUTATION_KEY,
      onError: (error) => {
        addError(error, { title: i18n.CREATE_ATTACK_DISCOVERY_SCHEDULES_FAILURE() });
      },
      onSuccess: (createdSchedule) => {
        // Work around eventual consistency: the schedules find API can lag immediately after create.
        // Optimistically insert the newly created schedule into any cached lists so it appears
        // instantly without requiring a page refresh.
        const queries = queryClient.getQueriesData(['GET', INTERNAL_SCHEDULES_FIND]);
        let created: ReturnType<
          typeof transformAttackDiscoveryScheduleToAttackDiscoverySchedule
        > | null = null;

        try {
          created = transformAttackDiscoveryScheduleToAttackDiscoverySchedule(createdSchedule);
        } catch {
          // If the create API returns a partial schedule shape, skip the optimistic cache update.
          // The invalidation below will reconcile once the schedule is searchable.
          created = null;
        }

        if (created != null) {
          for (const [key, data] of queries) {
            const maybe = data as FindSchedulesResponse | null;
            const schedules = maybe?.schedules;
            const total = maybe?.total;

            const canUpdate =
              Array.isArray(schedules) &&
              typeof total === 'number' &&
              !schedules.some((s) => s.id === created.id);

            if (canUpdate) {
              queryClient.setQueryData(key, {
                schedules: [created, ...schedules],
                total: total + 1,
              });
            }
          }
        }

        invalidateFindWorkflowSchedules();
        addSuccess(i18n.CREATE_ATTACK_DISCOVERY_SCHEDULES_SUCCESS());
      },
    }
  );
};
