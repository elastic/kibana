/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMutation } from '@kbn/react-query';
import type { BulkActionAttackDiscoverySchedulesResponse } from '@kbn/elastic-assistant-common';
import { ATTACK_DISCOVERY_SCHEDULES_BULK_ENABLE } from '@kbn/elastic-assistant-common';

import * as i18n from './translations';
import { bulkEnableAttackDiscoverySchedules } from '../api';
import { useInvalidateGetAttackDiscoverySchedule } from './use_get_schedule';
import { useInvalidateFindAttackDiscoverySchedule } from './use_find_schedules';
import { useAppToasts } from '../../../../../common/hooks/use_app_toasts';
import { useKibana } from '../../../../../common/lib/kibana';
import { AttackDiscoverySchedulesEventTypes } from '../../../../../common/lib/telemetry';

export const BULK_ENABLE_ATTACK_DISCOVERY_SCHEDULES_MUTATION_KEY = [
  'POST',
  ATTACK_DISCOVERY_SCHEDULES_BULK_ENABLE,
];

interface BulkEnableAttackDiscoverySchedulesParams {
  ids: string[];
}

export const useBulkEnableAttackDiscoverySchedules = () => {
  const {
    services: { telemetry },
  } = useKibana();
  const { addError, addSuccess } = useAppToasts();

  const invalidateGetAttackDiscoverySchedule = useInvalidateGetAttackDiscoverySchedule();
  const invalidateFindAttackDiscoverySchedule = useInvalidateFindAttackDiscoverySchedule();

  return useMutation<
    BulkActionAttackDiscoverySchedulesResponse,
    Error,
    BulkEnableAttackDiscoverySchedulesParams
  >(({ ids }) => bulkEnableAttackDiscoverySchedules({ ids }), {
    mutationKey: BULK_ENABLE_ATTACK_DISCOVERY_SCHEDULES_MUTATION_KEY,
    onSuccess: ({ ids }) => {
      ids.forEach(invalidateGetAttackDiscoverySchedule);
      invalidateFindAttackDiscoverySchedule();
      addSuccess(i18n.ENABLE_ATTACK_DISCOVERY_SCHEDULES_SUCCESS(ids.length));
      telemetry.reportEvent(AttackDiscoverySchedulesEventTypes.BulkStatusUpdateSuccess, {
        status: 'enabled',
        count: ids.length,
      });
    },
    onError: (error, { ids }) => {
      addError(error, { title: i18n.ENABLE_ATTACK_DISCOVERY_SCHEDULES_FAILURE(ids.length) });
      telemetry.reportEvent(AttackDiscoverySchedulesEventTypes.BulkStatusUpdateFailed, {
        status: 'enabled',
        count: ids.length,
      });
    },
  });
};
