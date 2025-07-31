/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ActionsClient } from '@kbn/actions-plugin/server';
import { Logger } from '@kbn/core/server';
import {
  AttackDiscoveryScheduleAction,
  AttackDiscoveryScheduleActionGroup,
} from '@kbn/elastic-assistant-common';

type AlertingAction = Omit<AttackDiscoveryScheduleAction, 'group'> & {
  group: AttackDiscoveryScheduleActionGroup;
};

type AlertingSystemAction = Omit<
  AttackDiscoveryScheduleAction,
  'group' | 'frequency' | 'alertsFilter' | 'useAlertDataForTemplate'
>;

const isAlertingActions = (action: AttackDiscoveryScheduleAction): action is AlertingAction => {
  return action.group != null;
};

export const convertScheduleActionsToAlertingActions = ({
  actionsClient,
  logger,
  scheduleActions,
}: {
  actionsClient: ActionsClient;
  logger: Logger;
  scheduleActions: AttackDiscoveryScheduleAction[] | undefined;
}) => {
  return (scheduleActions ?? []).reduce(
    (acc, value) => {
      if (actionsClient.isSystemAction(value.id)) {
        acc.systemActions.push(value);
      } else {
        if (isAlertingActions(value)) {
          acc.actions.push(value);
        } else {
          logger.error(
            `Missing group for non-system action ${value.id} of type ${value.actionTypeId}`
          );
        }
      }
      return acc;
    },
    { actions: [], systemActions: [] } as {
      actions: AlertingAction[];
      systemActions: AlertingSystemAction[];
    }
  );
};
