/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ApiClientFixture } from '@kbn/scout-security';
import { expect } from '@kbn/scout-security/api';
import {
  ACTION_DETAILS_ROUTE,
  GET_PROCESSES_ROUTE,
  KILL_PROCESS_ROUTE,
  SUSPEND_PROCESS_ROUTE,
} from '../../../../common/endpoint/constants';
import type {
  ActionDetails,
  ActionDetailsApiResponse,
  EndpointActionResponseDataOutput,
  ProcessesEntry,
} from '../../../../common/endpoint/types';

const ACTION_TIMEOUT_MS = 120_000;

type GetProcessesOutput = Extract<EndpointActionResponseDataOutput, { entries: ProcessesEntry[] }>;

type ActionResponse<
  TOutput extends EndpointActionResponseDataOutput = EndpointActionResponseDataOutput
> = ActionDetailsApiResponse<TOutput>;

const actionDetailsPath = (actionId: string): string =>
  ACTION_DETAILS_ROUTE.replace('{action_id}', encodeURIComponent(actionId));

const assertOk = (statusCode: number, body: unknown, method: string, path: string): void => {
  if (statusCode >= 400 && statusCode < 500) {
    throw new Error(`${method} ${path} failed with status ${statusCode}: ${JSON.stringify(body)}`);
  }
};

const createAction = async (
  apiClient: ApiClientFixture,
  headers: Record<string, string>,
  path: string,
  body: { endpoint_ids: string[]; agent_type: 'endpoint'; parameters?: { pid: number } }
): Promise<string> => {
  const response = await apiClient.post<ActionResponse>(path, {
    headers,
    responseType: 'json',
    body,
  });
  assertOk(response.statusCode, response.body, 'POST', path);

  if (response.statusCode !== 200) {
    throw new Error(
      `POST ${path} returned status ${response.statusCode}: ${JSON.stringify(response.body)}`
    );
  }

  const actionId = response.body.data.id;
  if (!actionId) {
    throw new Error(`Response action did not return an id: ${JSON.stringify(response.body)}`);
  }

  return actionId;
};

const waitForSuccessfulAction = async <
  TOutput extends EndpointActionResponseDataOutput = EndpointActionResponseDataOutput
>(
  apiClient: ApiClientFixture,
  headers: Record<string, string>,
  actionId: string
): Promise<ActionDetails<TOutput>> => {
  let latest: ActionDetails<TOutput> | undefined;
  const path = actionDetailsPath(actionId);

  await expect
    .poll(
      async () => {
        const response = await apiClient.get<ActionResponse<TOutput>>(path, {
          headers,
          responseType: 'json',
        });

        if (response.statusCode >= 400 && response.statusCode < 500) {
          throw new Error(
            `GET ${path} failed with status ${response.statusCode}: ${JSON.stringify(
              response.body
            )}`
          );
        }

        if (response.statusCode !== 200) {
          return `status ${response.statusCode}: ${JSON.stringify(response.body)}`;
        }

        latest = response.body.data;
        return latest.isCompleted;
      },
      {
        timeout: ACTION_TIMEOUT_MS,
        intervals: [2_000],
        message: `Action ${actionId} did not complete`,
      }
    )
    .toBe(true);

  if (!latest || !latest.wasSuccessful || latest.status !== 'successful') {
    throw new Error(
      `Action ${actionId} completed with status ${latest?.status}: ${JSON.stringify(
        latest?.errors
      )}`
    );
  }

  return latest;
};

const runAction = async <
  TOutput extends EndpointActionResponseDataOutput = EndpointActionResponseDataOutput
>(
  apiClient: ApiClientFixture,
  headers: Record<string, string>,
  path: string,
  body: { endpoint_ids: string[]; agent_type: 'endpoint'; parameters?: { pid: number } }
): Promise<ActionDetails<TOutput>> => {
  const actionId = await createAction(apiClient, headers, path, body);
  return waitForSuccessfulAction<TOutput>(apiClient, headers, actionId);
};

export const listRunningProcesses = async (
  apiClient: ApiClientFixture,
  headers: Record<string, string>,
  agentId: string
): Promise<ProcessesEntry[]> => {
  const action = await runAction<GetProcessesOutput>(apiClient, headers, GET_PROCESSES_ROUTE, {
    endpoint_ids: [agentId],
    agent_type: 'endpoint',
  });
  const entries = action.outputs?.[agentId]?.content.entries;

  if (!entries) {
    throw new Error(
      `processes action ${action.id} has no output for agent ${agentId}: ${JSON.stringify(
        action.errors
      )}`
    );
  }

  return entries;
};

export const killProcess = async (
  apiClient: ApiClientFixture,
  headers: Record<string, string>,
  agentId: string,
  pid: number
): Promise<void> => {
  await runAction(apiClient, headers, KILL_PROCESS_ROUTE, {
    endpoint_ids: [agentId],
    agent_type: 'endpoint',
    parameters: { pid },
  });
};

export const suspendProcess = async (
  apiClient: ApiClientFixture,
  headers: Record<string, string>,
  agentId: string,
  pid: number
): Promise<void> => {
  await runAction(apiClient, headers, SUSPEND_PROCESS_ROUTE, {
    endpoint_ids: [agentId],
    agent_type: 'endpoint',
    parameters: { pid },
  });
};
