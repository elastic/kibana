/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AttackDiscoveryScheduleAction } from '@kbn/elastic-assistant-common';
import type { ScheduleAction, ScheduleGeneralAction } from '@kbn/discoveries-schemas';

const isGeneralAction = (action: ScheduleAction): action is ScheduleGeneralAction =>
  Object.hasOwn(action, 'group');

/**
 * Transforms snake_case API schedule actions to camelCase internal format
 * used by the AttackDiscoveryScheduleDataClient.
 */
export const transformActionsFromApi = (
  actions: ScheduleAction[] | undefined
): AttackDiscoveryScheduleAction[] | undefined =>
  actions?.map((action): AttackDiscoveryScheduleAction => {
    if (isGeneralAction(action)) {
      return {
        actionTypeId: action.action_type_id,
        alertsFilter: action.alerts_filter,
        frequency: action.frequency
          ? {
              notifyWhen: action.frequency.notify_when,
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
      actionTypeId: action.action_type_id,
      id: action.id,
      params: action.params,
      uuid: action.uuid,
    };
  });
