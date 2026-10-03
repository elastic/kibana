/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createServerStepDefinition } from '@kbn/workflows-extensions/server';
import { DETECTION_ENGINE_ATTACKS_ASSIGNEES_URL } from '../../../../common/constants';
import { assignAttackStepCommonDefinition } from '../../../../common/workflows/step_types/assign_attack_step/assign_attack_step_common';
import { toAlertApiExecutionError } from '../to_alert_api_execution_error';

export const assignAttackStepDefinition = createServerStepDefinition({
  ...assignAttackStepCommonDefinition,
  handler: async (context) => {
    const {
      ids,
      assignees_to_add: add,
      assignees_to_remove: remove,
      update_related_alerts: updateRelatedAlerts,
    } = context.input;

    const attackIds = Array.isArray(ids) ? ids : [ids];

    try {
      await context.contextManager.callKibanaApi<{
        took?: number;
        errors?: boolean;
        items?: unknown[];
      }>({
        method: 'POST',
        path: DETECTION_ENGINE_ATTACKS_ASSIGNEES_URL,
        body: {
          ids: attackIds,
          assignees: {
            add,
            remove,
          },
          update_related_alerts: updateRelatedAlerts,
        },
      });

      return {
        output: {
          success: true,
          message: `Successfully updated assignees for ${attackIds.length} attack(s)`,
        },
      };
    } catch (error) {
      throw toAlertApiExecutionError(error, 'assign attack');
    }
  },
});
