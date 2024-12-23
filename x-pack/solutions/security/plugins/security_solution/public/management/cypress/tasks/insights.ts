/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ActionType } from '../../../../common/endpoint/types/workflow_insights';
import { request } from './common';
import {
  WORKFLOW_INSIGHTS_ROUTE,
  WORKFLOW_INSIGHTS_UPDATE_ROUTE,
} from '../../../../common/endpoint/constants';

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
    url: WORKFLOW_INSIGHTS_UPDATE_ROUTE.replace('{insightId', 'test'),
    body: {
      action: {
        type: ActionType.Remediated,
      },
    },
    headers: { 'Elastic-Api-Version': '1' },
    failOnStatusCode: false,
  });
};
