/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMutation } from '@kbn/react-query';
import type { BulkActionAttackDiscoverySchedulesResponse } from '@kbn/elastic-assistant-common';

import * as i18n from './translations';
import { deleteWorkflowSchedule, INTERNAL_SCHEDULES_BY_ID } from '../api/internal';
import { fanOutBulkScheduleAction } from './fan_out_bulk_schedule_action';
import { useInvalidateGetWorkflowSchedule } from './use_get_workflow_schedule';
import { useInvalidateFindWorkflowSchedules } from './use_find_workflow_schedules';
import { useAppToasts } from '../../../../../common/hooks/use_app_toasts';
import { useKibana } from '../../../../../common/lib/kibana';
import { AttackDiscoverySchedulesEventTypes } from '../../../../../common/lib/telemetry';

export const BULK_DELETE_WORKFLOW_SCHEDULES_MUTATION_KEY = [
  'DELETE',
  INTERNAL_SCHEDULES_BY_ID,
  'bulk',
];

interface BulkDeleteWorkflowSchedulesParams {
  ids: string[];
}

/**
 * NOTE: Despite the "Workflow" in its name, this hook deletes alerting rules (not
 * workflow definitions). The internal API has no bulk endpoint, so this fans the
 * action out to the internal per-id `{id}` DELETE route and returns the same
 * `BulkActionAttackDiscoverySchedulesResponse` shape as the public hook, so the
 * table can consume either interchangeably. The "workflow" prefix is a historical
 * artifact; renaming is deferred to a follow-up PR (Option C: Hybrid Scheduling
 * Migration).
 */
export const useBulkDeleteWorkflowSchedules = () => {
  const {
    services: { telemetry },
  } = useKibana();
  const { addError, addSuccess } = useAppToasts();

  const invalidateGetWorkflowSchedule = useInvalidateGetWorkflowSchedule();
  const invalidateFindWorkflowSchedules = useInvalidateFindWorkflowSchedules();

  return useMutation<
    BulkActionAttackDiscoverySchedulesResponse,
    Error,
    BulkDeleteWorkflowSchedulesParams
  >(
    ({ ids }) => fanOutBulkScheduleAction({ action: (id) => deleteWorkflowSchedule({ id }), ids }),
    {
      mutationKey: BULK_DELETE_WORKFLOW_SCHEDULES_MUTATION_KEY,
      onSuccess: ({ ids }) => {
        ids.forEach(invalidateGetWorkflowSchedule);
        invalidateFindWorkflowSchedules();
        addSuccess(i18n.DELETE_ATTACK_DISCOVERY_SCHEDULES_SUCCESS(ids.length));
        telemetry.reportEvent(AttackDiscoverySchedulesEventTypes.BulkDeleteSuccess, {
          count: ids.length,
        });
      },
      onError: (error, { ids }) => {
        addError(error, { title: i18n.DELETE_ATTACK_DISCOVERY_SCHEDULES_FAILURE(ids.length) });
        telemetry.reportEvent(AttackDiscoverySchedulesEventTypes.BulkDeleteFailed, {
          count: ids.length,
        });
      },
    }
  );
};
