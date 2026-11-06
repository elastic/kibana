/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  AttackDiscoveryScheduleAction,
  AttackDiscoveryScheduleGeneralAction,
} from '@kbn/elastic-assistant-common';
import type { ScheduleAction } from '@kbn/discoveries-schemas';

const isGeneralAction = (
  action: AttackDiscoveryScheduleAction
): action is AttackDiscoveryScheduleGeneralAction => Object.hasOwn(action, 'group');

/**
 * Transforms camelCase internal schedule actions to snake_case API format
 * for the AttackDiscoverySchedule response.
 */
export const transformActionsToApi = (
  actions: AttackDiscoveryScheduleAction[] | undefined
): ScheduleAction[] =>
  actions?.map((action): ScheduleAction => {
    if (isGeneralAction(action)) {
      return {
        action_type_id: action.actionTypeId,
        alerts_filter: action.alertsFilter,
        frequency: action.frequency
          ? {
              notify_when: action.frequency.notifyWhen,
              summary: action.frequency.summary,
              throttle: action.frequency.throttle,
            }
          : undefined,
        group: action.group,
        id: action.id,
        params: action.params,
        uuid: action.uuid,
      };
    }

    return {
      action_type_id: action.actionTypeId,
      id: action.id,
      params: action.params,
      uuid: action.uuid,
    };
  }) ?? [];
