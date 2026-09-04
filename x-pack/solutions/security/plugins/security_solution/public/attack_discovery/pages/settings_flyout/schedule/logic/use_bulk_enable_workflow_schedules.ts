/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMutation } from '@kbn/react-query';
import type { BulkActionAttackDiscoverySchedulesResponse } from '@kbn/elastic-assistant-common';

import * as i18n from './translations';
import { enableWorkflowSchedule, INTERNAL_SCHEDULES_ENABLE } from '../api/internal';
import { fanOutBulkScheduleAction } from './fan_out_bulk_schedule_action';
import { useInvalidateGetWorkflowSchedule } from './use_get_workflow_schedule';
import { useInvalidateFindWorkflowSchedules } from './use_find_workflow_schedules';
import { useAppToasts } from '../../../../../common/hooks/use_app_toasts';
import { useKibana } from '../../../../../common/lib/kibana';
import { AttackDiscoverySchedulesEventTypes } from '../../../../../common/lib/telemetry';

export const BULK_ENABLE_WORKFLOW_SCHEDULES_MUTATION_KEY = [
  'POST',
  INTERNAL_SCHEDULES_ENABLE,
  'bulk',
];

interface BulkEnableWorkflowSchedulesParams {
  ids: string[];
}

/**
 * NOTE: Despite the "Workflow" in its name, this hook enables alerting rules (not
 * workflow definitions). The internal API has no bulk endpoint, so this fans the
 * action out to the internal per-id `_enable` route and returns the same
 * `BulkActionAttackDiscoverySchedulesResponse` shape as the public hook, so the
 * table can consume either interchangeably. The "workflow" prefix is a historical
 * artifact; renaming is deferred to a follow-up PR (Option C: Hybrid Scheduling
 * Migration).
 */
export const useBulkEnableWorkflowSchedules = () => {
  const {
    services: { telemetry },
  } = useKibana();
  const { addError, addSuccess } = useAppToasts();

  const invalidateGetWorkflowSchedule = useInvalidateGetWorkflowSchedule();
  const invalidateFindWorkflowSchedules = useInvalidateFindWorkflowSchedules();

  return useMutation<
    BulkActionAttackDiscoverySchedulesResponse,
    Error,
    BulkEnableWorkflowSchedulesParams
  >(
    ({ ids }) => fanOutBulkScheduleAction({ action: (id) => enableWorkflowSchedule({ id }), ids }),
    {
      mutationKey: BULK_ENABLE_WORKFLOW_SCHEDULES_MUTATION_KEY,
      onSuccess: ({ ids }) => {
        ids.forEach(invalidateGetWorkflowSchedule);
        invalidateFindWorkflowSchedules();
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
    }
  );
};
