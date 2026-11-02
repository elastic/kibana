/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ActionsClient } from '@kbn/actions-plugin/server';
import type {
  AttackDiscoveryScheduleAction,
  AttackDiscoveryScheduleGeneralAction,
  AttackDiscoveryScheduleSystemAction,
} from '@kbn/elastic-assistant-common';

const isSystemAction = (
  action: AttackDiscoveryScheduleAction,
  actionsClient: ActionsClient
): action is AttackDiscoveryScheduleSystemAction => {
  return actionsClient.isSystemAction(action.id);
};

export const convertScheduleActionsToAlertingActions = ({
  actionsClient,
  scheduleActions,
}: {
  actionsClient: ActionsClient;
  scheduleActions: AttackDiscoveryScheduleAction[] | undefined;
}) => {
  return (scheduleActions ?? []).reduce(
    (acc, value) => {
      if (isSystemAction(value, actionsClient)) {
        acc.systemActions.push(value);
      } else {
        acc.actions.push(value);
      }
      return acc;
    },
    { actions: [], systemActions: [] } as {
      actions: AttackDiscoveryScheduleGeneralAction[];
      systemActions: AttackDiscoveryScheduleSystemAction[];
    }
  );
};
