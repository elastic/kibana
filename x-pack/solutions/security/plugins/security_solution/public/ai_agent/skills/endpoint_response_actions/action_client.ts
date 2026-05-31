/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ActionResult } from './use_execute_action';
import {
  ISOLATE_HOST_ROUTE_V2,
  UNISOLATE_HOST_ROUTE_V2,
} from '../../../../common/endpoint/constants';
import type {
  IsolationRouteRequestBody,
  UnisolationRouteRequestBody,
} from '../../../../common/api/endpoint';
import type { ResponseActionApiResponse, ActionDetailsApiResponse } from '../../../../common/endpoint/types';
import { KibanaServices } from '../../../common/lib/kibana';

export const executeAction = async (
  actionType: string,
  agentId: string
): Promise<{ actionId: string }> => {
  const http = KibanaServices.get().http;

  const body: IsolationRouteRequestBody | UnisolationRouteRequestBody = {
    endpoint_ids: [agentId],
    comment: `Triggered via AI Agent (${actionType})`,
    agent_type: 'endpoint',
  };

  const route =
    actionType === 'isolate' ? ISOLATE_HOST_ROUTE_V2 : UNISOLATE_HOST_ROUTE_V2;

  const response = await http.post<ResponseActionApiResponse>(route, {
    body: JSON.stringify(body),
    version: '2023-10-31',
  });

  return { actionId: response.data.id };
};

export const pollActionStatus = async (actionId: string): Promise<ActionResult> => {
  const http = KibanaServices.get().http;

  const { resolvePathVariables } = await import(
    '../../../common/utils/resolve_path_variables'
  );
  const { ACTION_DETAILS_ROUTE } = await import(
    '../../../../common/endpoint/constants'
  );

  const path = resolvePathVariables(ACTION_DETAILS_ROUTE, { action_id: actionId });

  const response = await http.get<ActionDetailsApiResponse>(path, { version: '2023-10-31' });

  const status = response.data.status;
  const isCompleted = status === 'successful';
  const isFailed = status === 'failed';

  // Collect error messages from per-agent state when the action failed
  const agentErrors = isFailed
    ? Object.values(response.data.agentState)
        .flatMap((agentState) => agentState.errors ?? [])
        .filter(Boolean)
    : [];

  return {
    actionId,
    status: isCompleted ? 'completed' : isFailed ? 'failed' : 'pending',
    timestamp: new Date().toISOString(),
    errorMessage: agentErrors.length > 0 ? agentErrors.join('; ') : undefined,
  };
};
