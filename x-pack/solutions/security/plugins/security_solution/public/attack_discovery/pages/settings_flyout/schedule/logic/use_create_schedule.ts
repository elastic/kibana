/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMutation } from '@tanstack/react-query';
import type {
  AttackDiscoveryScheduleCreateProps,
  CreateAttackDiscoverySchedulesResponse,
} from '@kbn/elastic-assistant-common';
import { ATTACK_DISCOVERY_SCHEDULES } from '@kbn/elastic-assistant-common';

import * as i18n from './translations';
import { createAttackDiscoverySchedule } from '../api';
import { useInvalidateFindAttackDiscoverySchedule } from './use_find_schedules';
import { useAppToasts } from '../../../../../common/hooks/use_app_toasts';

export const CREATE_ATTACK_DISCOVERY_SCHEDULE_MUTATION_KEY = ['POST', ATTACK_DISCOVERY_SCHEDULES];

interface CreateAttackDiscoveryScheduleParams {
  scheduleToCreate: AttackDiscoveryScheduleCreateProps;
}

export const useCreateAttackDiscoverySchedule = () => {
  const { addError, addSuccess } = useAppToasts();

  const invalidateFindAttackDiscoverySchedule = useInvalidateFindAttackDiscoverySchedule();

  return useMutation<
    CreateAttackDiscoverySchedulesResponse,
    Error,
    CreateAttackDiscoveryScheduleParams
  >(({ scheduleToCreate }) => createAttackDiscoverySchedule({ body: scheduleToCreate }), {
    mutationKey: CREATE_ATTACK_DISCOVERY_SCHEDULE_MUTATION_KEY,
    onSuccess: () => {
      invalidateFindAttackDiscoverySchedule();
      addSuccess(i18n.CREATE_ATTACK_DISCOVERY_SCHEDULES_SUCCESS());
    },
    onError: (error) => {
      addError(error, { title: i18n.CREATE_ATTACK_DISCOVERY_SCHEDULES_FAILURE() });
    },
  });
};
