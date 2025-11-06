/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMutation } from '@kbn/react-query';
import type { DisableAttackDiscoverySchedulesResponse } from '@kbn/elastic-assistant-common';
import { ATTACK_DISCOVERY_SCHEDULES_BY_ID_DISABLE } from '@kbn/elastic-assistant-common';

import * as i18n from './translations';
import { disableAttackDiscoverySchedule } from '../api';
import { useInvalidateGetAttackDiscoverySchedule } from './use_get_schedule';
import { useInvalidateFindAttackDiscoverySchedule } from './use_find_schedules';
import { useAppToasts } from '../../../../../common/hooks/use_app_toasts';

export const DISABLE_ATTACK_DISCOVERY_SCHEDULE_MUTATION_KEY = [
  'POST',
  ATTACK_DISCOVERY_SCHEDULES_BY_ID_DISABLE,
];

interface DisableAttackDiscoveryScheduleParams {
  id: string;
}

export const useDisableAttackDiscoverySchedule = () => {
  const { addError, addSuccess } = useAppToasts();

  const invalidateGetAttackDiscoverySchedule = useInvalidateGetAttackDiscoverySchedule();
  const invalidateFindAttackDiscoverySchedule = useInvalidateFindAttackDiscoverySchedule();

  return useMutation<
    DisableAttackDiscoverySchedulesResponse,
    Error,
    DisableAttackDiscoveryScheduleParams
  >(({ id }) => disableAttackDiscoverySchedule({ id }), {
    mutationKey: DISABLE_ATTACK_DISCOVERY_SCHEDULE_MUTATION_KEY,
    onSuccess: ({ id }) => {
      invalidateGetAttackDiscoverySchedule(id);
      invalidateFindAttackDiscoverySchedule();
      addSuccess(i18n.DISABLE_ATTACK_DISCOVERY_SCHEDULES_SUCCESS());
    },
    onError: (error) => {
      addError(error, { title: i18n.DISABLE_ATTACK_DISCOVERY_SCHEDULES_FAILURE() });
    },
  });
};
