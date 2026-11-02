/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMutation } from '@kbn/react-query';
import type { BulkActionAttackDiscoverySchedulesResponse } from '@kbn/elastic-assistant-common';

import * as i18n from './translations';
import { disableWorkflowSchedule, INTERNAL_SCHEDULES_DISABLE } from '../api/internal';
import { fanOutBulkScheduleAction } from './fan_out_bulk_schedule_action';
import { useInvalidateGetWorkflowSchedule } from './use_get_workflow_schedule';
import { useInvalidateFindWorkflowSchedules } from './use_find_workflow_schedules';
import { useAppToasts } from '../../../../../common/hooks/use_app_toasts';
import { useKibana } from '../../../../../common/lib/kibana';
import { AttackDiscoverySchedulesEventTypes } from '../../../../../common/lib/telemetry';

export const BULK_DISABLE_WORKFLOW_SCHEDULES_MUTATION_KEY = [
  'POST',
  INTERNAL_SCHEDULES_DISABLE,
  'bulk',
];

interface BulkDisableWorkflowSchedulesParams {
  ids: string[];
}

/**
 * NOTE: Despite the "Workflow" in its name, this hook disables alerting rules (not
 * workflow definitions). The internal API has no bulk endpoint, so this fans the
 * action out to the internal per-id `_disable` route and returns the same
 * `BulkActionAttackDiscoverySchedulesResponse` shape as the public hook, so the
 * table can consume either interchangeably. The "workflow" prefix is a historical
 * artifact; renaming is deferred to a follow-up PR (Option C: Hybrid Scheduling
 * Migration).
 */
export const useBulkDisableWorkflowSchedules = () => {
  const {
    services: { telemetry },
  } = useKibana();
  const { addError, addSuccess } = useAppToasts();

  const invalidateGetWorkflowSchedule = useInvalidateGetWorkflowSchedule();
  const invalidateFindWorkflowSchedules = useInvalidateFindWorkflowSchedules();

  return useMutation<
    BulkActionAttackDiscoverySchedulesResponse,
    Error,
    BulkDisableWorkflowSchedulesParams
  >(
    ({ ids }) => fanOutBulkScheduleAction({ action: (id) => disableWorkflowSchedule({ id }), ids }),
    {
      mutationKey: BULK_DISABLE_WORKFLOW_SCHEDULES_MUTATION_KEY,
      onSuccess: ({ ids }) => {
        ids.forEach(invalidateGetWorkflowSchedule);
        invalidateFindWorkflowSchedules();
        addSuccess(i18n.DISABLE_ATTACK_DISCOVERY_SCHEDULES_SUCCESS(ids.length));
        telemetry.reportEvent(AttackDiscoverySchedulesEventTypes.BulkStatusUpdateSuccess, {
          status: 'disabled',
          count: ids.length,
        });
      },
      onError: (error, { ids }) => {
        addError(error, { title: i18n.DISABLE_ATTACK_DISCOVERY_SCHEDULES_FAILURE(ids.length) });
        telemetry.reportEvent(AttackDiscoverySchedulesEventTypes.BulkStatusUpdateFailed, {
          status: 'disabled',
          count: ids.length,
        });
      },
    }
  );
};
