/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createServerStepDefinition } from '@kbn/workflows-extensions/server';
import { DETECTION_ENGINE_ATTACKS_TAGS_URL } from '../../../../common/constants';
import { setAttackTagsStepCommonDefinition } from '../../../../common/workflows/step_types/set_attack_tags_step/set_attack_tags_step_common';
import { toAlertApiExecutionError } from '../to_alert_api_execution_error';

export const setAttackTagsStepDefinition = createServerStepDefinition({
  ...setAttackTagsStepCommonDefinition,
  handler: async (context) => {
    const {
      ids: attackIds,
      tags_to_add: tagsToAdd = [],
      tags_to_remove: tagsToRemove = [],
      update_related_alerts: updateRelatedAlerts = false,
    } = context.input;
    const ids = Array.isArray(attackIds) ? attackIds : [attackIds];

    try {
      await context.contextManager.callKibanaApi<Record<string, unknown>>({
        method: 'POST',
        path: DETECTION_ENGINE_ATTACKS_TAGS_URL,
        body: {
          ids,
          tags: {
            tags_to_add: tagsToAdd,
            tags_to_remove: tagsToRemove,
          },
          update_related_alerts: updateRelatedAlerts,
        },
      });

      const addedCount = tagsToAdd.length;
      const removedCount = tagsToRemove.length;
      const parts: string[] = [];
      if (addedCount > 0) parts.push(`added ${addedCount} tag(s)`);
      if (removedCount > 0) parts.push(`removed ${removedCount} tag(s)`);

      return {
        output: {
          success: true,
          message: `Successfully ${parts.join(' and ')} on ${ids.length} attack(s)`,
        },
      };
    } catch (error) {
      throw toAlertApiExecutionError(error, 'set attack tags');
    }
  },
});
