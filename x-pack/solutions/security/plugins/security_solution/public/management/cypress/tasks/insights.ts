/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { DEFEND_INSIGHTS } from '@kbn/elastic-assistant-common';
import { ActionType } from '../../../../common/endpoint/types/workflow_insights';
import { request } from './common';
import {
  WORKFLOW_INSIGHTS_ROUTE,
  WORKFLOW_INSIGHTS_UPDATE_ROUTE,
} from '../../../../common/endpoint/constants';

export const triggerRunningDefendInsights = () => {
  return request({
    method: 'POST',
    url: DEFEND_INSIGHTS,
    body: JSON.stringify({
      endpointIds: ['test'],
      insightType: 'incompatible_antivirus',
      anonymizationFields: [],
      replacements: {},
      subAction: 'invokeAI',
      apiConfig: {
        connectorId: 'test',
        actionTypeId: 'test',
      },
    }),
    headers: { 'Elastic-Api-Version': '1' },
    failOnStatusCode: false,
  });
};

export const fetchRunningDefendInsights = () => {
  return request({
    method: 'GET',
    url: DEFEND_INSIGHTS,
    qs: {
      status: 'running',
      endpoint_ids: 'test',
    },
    headers: { 'Elastic-Api-Version': '1' },
    failOnStatusCode: false,
  });
};

export const fetchWorkflowInsights = (overrides?: Record<string, unknown>) => {
  return request({
    method: 'GET',
    url: WORKFLOW_INSIGHTS_ROUTE,
    qs: {
      actionTypes: JSON.stringify([ActionType.Refreshed]),
      targetIds: JSON.stringify(['test']),
    },
    headers: { 'Elastic-Api-Version': '1' },
    ...(overrides ?? {}),
  });
};

export const updateWorkflowInsights = () => {
  return request({
    method: 'PUT',
    url: WORKFLOW_INSIGHTS_UPDATE_ROUTE.replace('{insightId}', 'test'),
    body: JSON.stringify({
      action: {
        type: ActionType.Remediated,
      },
    }),
    headers: { 'Elastic-Api-Version': '1' },
    failOnStatusCode: false,
  });
};
