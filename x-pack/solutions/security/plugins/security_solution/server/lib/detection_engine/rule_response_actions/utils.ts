/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { get } from 'lodash';
import { i18n } from '@kbn/i18n';
import type { AlertAgent, AlertsAction, AlertWithAgent } from './types';
import type { ProcessesParams } from '../../../../common/api/detection_engine';

interface ProcessAlertsAcc {
  [key: string]: Record<string, AlertsAction>;
}

export const FIELD_NOT_EXIST = (field: string): string =>
  i18n.translate('xpack.securitySolution.responseActionsList.error.nonExistingFieldName', {
    defaultMessage: 'The action was called with a non-existing event field name: {field}',
    values: { field },
  });

export const getProcessAlerts = (
  alerts: AlertWithAgent[],
  config: ProcessesParams['config']
): ProcessAlertsAcc => {
  if (!config) {
    return {};
  }
  const { overwrite, field } = config;

  return alerts.reduce((acc: ProcessAlertsAcc, alert) => {
    const valueFromAlert: number = overwrite ? alert.process?.pid : get(alert, field);

    if (valueFromAlert) {
      const isEntityId = !overwrite && field.includes('entity_id');
      const paramKey = isEntityId ? 'entity_id' : 'pid';
      const { _id, agent } = alert;
      const { id: agentId, name } = agent as AlertAgent;
      const hostName = alert.host?.name;

      const currentAgent = acc[agentId];
      const currentValue = currentAgent?.[valueFromAlert];

      return {
        ...acc,
        [agentId]: {
          ...(currentAgent || {}),
          [valueFromAlert]: {
            ...(currentValue || {}),
            alert_ids: [...(currentValue?.alert_ids || []), _id],
            parameters: { [paramKey]: valueFromAlert },
            endpoint_ids: [agentId],
            hosts: {
              ...currentValue?.hosts,
              [agentId]: { name: name || hostName, id: agentId },
            },
          },
        },
      };
    }
    return acc;
  }, {});
};

export const getErrorProcessAlerts = (
  alerts: AlertWithAgent[],
  config: ProcessesParams['config']
): ProcessAlertsAcc => {
  if (!config) {
    return {};
  }
  const { overwrite, field } = config;

  return alerts.reduce((acc: ProcessAlertsAcc, alert) => {
    const valueFromAlert: number = overwrite ? alert.process?.pid : get(alert, field);

    if (!valueFromAlert) {
      const { _id, agent } = alert;
      const { id: agentId, name } = agent as AlertAgent;
      const hostName = alert.host?.name;

      const errorField = overwrite ? 'process.pid' : field;
      const currentAgent = acc[agentId];
      const currentValue = currentAgent?.[errorField];

      return {
        ...acc,
        [agentId]: {
          ...(currentAgent || {}),
          [errorField]: {
            ...(currentValue || {}),
            alert_ids: [...(currentValue?.alert_ids || []), _id],
            parameters: {},
            endpoint_ids: [agentId],
            hosts: {
              ...currentValue?.hosts,
              [agentId]: { name: name || hostName || '', id: agentId },
            },
            error: FIELD_NOT_EXIST(errorField),
          },
        },
      };
    }
    return acc;
  }, {});
};

export const getIsolateAlerts = (alerts: AlertWithAgent[]): Record<string, AlertsAction> =>
  alerts.reduce((acc: Record<string, AlertsAction>, alert) => {
    const { id: agentId, name: agentName } = alert.agent || {};

    const hostName = alert.host?.name;

    return {
      ...acc,
      [agentId]: {
        ...(acc?.[agentId] || {}),
        hosts: {
          ...(acc[agentId]?.hosts || {}),
          [agentId]: {
            name: agentName || hostName || '',
            id: agentId,
          },
        },
        endpoint_ids: [agentId],
        alert_ids: [...(acc[agentId]?.alert_ids || []), alert._id],
      },
    };
  }, {});
