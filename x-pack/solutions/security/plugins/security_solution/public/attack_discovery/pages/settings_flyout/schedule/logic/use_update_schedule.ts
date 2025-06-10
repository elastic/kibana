/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMutation } from '@tanstack/react-query';
import type {
  AttackDiscoveryScheduleUpdateProps,
  UpdateAttackDiscoverySchedulesResponse,
} from '@kbn/elastic-assistant-common';
import { ATTACK_DISCOVERY_SCHEDULES_BY_ID } from '@kbn/elastic-assistant-common';

import * as i18n from './translations';
import { updateAttackDiscoverySchedule } from '../api';
import { useInvalidateGetAttackDiscoverySchedule } from './use_get_schedule';
import { useInvalidateFindAttackDiscoverySchedule } from './use_find_schedules';
import { useAppToasts } from '../../../../../common/hooks/use_app_toasts';

export const UPDATE_ATTACK_DISCOVERY_SCHEDULE_MUTATION_KEY = [
  'PUT',
  ATTACK_DISCOVERY_SCHEDULES_BY_ID,
];

interface UpdateAttackDiscoveryScheduleParams {
  id: string;
  scheduleToUpdate: AttackDiscoveryScheduleUpdateProps;
}

export const useUpdateAttackDiscoverySchedule = () => {
  const { addError, addSuccess } = useAppToasts();

  const invalidateGetAttackDiscoverySchedule = useInvalidateGetAttackDiscoverySchedule();
  const invalidateFindAttackDiscoverySchedule = useInvalidateFindAttackDiscoverySchedule();

  return useMutation<
    UpdateAttackDiscoverySchedulesResponse,
    Error,
    UpdateAttackDiscoveryScheduleParams
  >(({ id, scheduleToUpdate }) => updateAttackDiscoverySchedule({ id, body: scheduleToUpdate }), {
    mutationKey: UPDATE_ATTACK_DISCOVERY_SCHEDULE_MUTATION_KEY,
    onSuccess: ({ id }) => {
      invalidateGetAttackDiscoverySchedule(id);
      invalidateFindAttackDiscoverySchedule();
      addSuccess(i18n.UPDATE_ATTACK_DISCOVERY_SCHEDULES_SUCCESS());
    },
    onError: (error) => {
      addError(error, { title: i18n.UPDATE_ATTACK_DISCOVERY_SCHEDULES_FAILURE() });
    },
  });
};
