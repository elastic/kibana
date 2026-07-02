/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createServerStepDefinition, KibanaApiCallError } from '@kbn/workflows-extensions/server';
import { ExecutionError } from '@kbn/workflows/server';
import { DETECTION_ENGINE_ATTACKS_STATUS_URL } from '../../../../common/constants';
import { setAttackStatusStepCommonDefinition } from '../../../../common/workflows/step_types/set_attack_status_step/set_attack_status_step_common';

export const setAttackStatusStepDefinition = createServerStepDefinition({
  ...setAttackStatusStepCommonDefinition,
  handler: async (context) => {
    const { ids, status, update_related_alerts: updateRelatedAlerts } = context.input;
    const reason = 'reason' in context.input ? context.input.reason : undefined;

    const attackIds = Array.isArray(ids) ? ids : [ids];

    try {
      await context.contextManager.callKibanaApi<{
        took?: number;
        errors?: boolean;
        items?: unknown[];
      }>({
        method: 'POST',
        path: DETECTION_ENGINE_ATTACKS_STATUS_URL,
        body: {
          ids: attackIds,
          status,
          update_related_alerts: updateRelatedAlerts,
          ...(reason ? { reason } : {}),
        },
      });

      return {
        output: {
          success: true,
          message: `Successfully updated status to ${status} for ${attackIds.length} attack(s)`,
        },
      };
    } catch (error) {
      if (error instanceof ExecutionError) {
        throw error;
      }
      // `callKibanaApi` throws `KibanaApiCallError` on any non-2xx response. Persist only the safe
      // scalar `status` (the human-readable body snippet is already in `message`); the full body and
      // headers stay on the in-process error instance and are never serialized to ES. Authors who
      // need the partial-success body can `catch (e) { if (e instanceof KibanaApiCallError) ... }`.
      if (error instanceof KibanaApiCallError) {
        throw new ExecutionError({
          type: 'ApiError',
          message: `Failed to set attack status: ${error.message}`,
          details: { status: error.status },
        });
      }
      throw new ExecutionError({
        type: 'ApiError',
        message: error instanceof Error ? error.message : 'Unknown error occurred',
      });
    }
  },
});
