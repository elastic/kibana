/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMutation } from '@tanstack/react-query';
import type { DeleteAttackDiscoverySchedulesResponse } from '@kbn/elastic-assistant-common';
import { ATTACK_DISCOVERY_SCHEDULES_BY_ID } from '@kbn/elastic-assistant-common';

import * as i18n from './translations';
import { deleteAttackDiscoverySchedule } from '../api';
import { useInvalidateGetAttackDiscoverySchedule } from './use_get_schedule';
import { useInvalidateFindAttackDiscoverySchedule } from './use_find_schedules';
import { useAppToasts } from '../../../../../common/hooks/use_app_toasts';
import { useKibanaFeatureFlags } from '../../../use_kibana_feature_flags';

export const DELETE_ATTACK_DISCOVERY_SCHEDULE_MUTATION_KEY = [
  'DELETE',
  ATTACK_DISCOVERY_SCHEDULES_BY_ID,
];

interface DeleteAttackDiscoveryScheduleParams {
  id: string;
}

export const useDeleteAttackDiscoverySchedule = () => {
  const { addError, addSuccess } = useAppToasts();
  const { attackDiscoveryPublicApiEnabled } = useKibanaFeatureFlags();

  const invalidateGetAttackDiscoverySchedule = useInvalidateGetAttackDiscoverySchedule();
  const invalidateFindAttackDiscoverySchedule = useInvalidateFindAttackDiscoverySchedule();

  return useMutation<
    DeleteAttackDiscoverySchedulesResponse,
    Error,
    DeleteAttackDiscoveryScheduleParams
  >(({ id }) => deleteAttackDiscoverySchedule({ attackDiscoveryPublicApiEnabled, id }), {
    mutationKey: DELETE_ATTACK_DISCOVERY_SCHEDULE_MUTATION_KEY,
    onSuccess: ({ id }) => {
      invalidateGetAttackDiscoverySchedule(id);
      invalidateFindAttackDiscoverySchedule();
      addSuccess(i18n.DELETE_ATTACK_DISCOVERY_SCHEDULES_SUCCESS());
    },
    onError: (error) => {
      addError(error, { title: i18n.DELETE_ATTACK_DISCOVERY_SCHEDULES_FAILURE() });
    },
  });
};
