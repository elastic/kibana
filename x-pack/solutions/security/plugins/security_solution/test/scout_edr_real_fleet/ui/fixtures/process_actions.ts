/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { PUBLIC_API_HEADERS } from '@kbn/scout-security';
import type { KbnClient } from '@kbn/scout-security';
import { expect } from '@kbn/scout-security/ui';
import {
  ACTION_DETAILS_ROUTE,
  GET_PROCESSES_ROUTE,
  KILL_PROCESS_ROUTE,
  SUSPEND_PROCESS_ROUTE,
} from '../../../../common/endpoint/constants';
import type {
  ActionDetails,
  ActionDetailsApiResponse,
  GetProcessesActionOutputContent,
  ProcessesEntry,
} from '../../../../common/endpoint/types';
import { resolvePathVariables } from '../../../../public/common/utils/resolve_path_variables';
import { getHostVmClient } from '../../../../scripts/endpoint/common/vm_services';

const ACTION_TIMEOUT_MS = 120_000;

const createAction = async (
  kbnClient: KbnClient,
  path: string,
  body: { endpoint_ids: string[]; parameters?: { pid: number } }
): Promise<string> => {
  const { data } = await kbnClient.request<ActionDetailsApiResponse>({
    method: 'POST',
    path,
    headers: PUBLIC_API_HEADERS,
    body,
    retries: 0,
  });
  const actionId = data.data.id;

  if (!actionId) {
    throw new Error(`Response action did not return an id: ${JSON.stringify(data)}`);
  }

  return actionId;
};

const waitForSuccessfulAction = async (
  kbnClient: KbnClient,
  actionId: string
): Promise<ActionDetails> => {
  let latest: ActionDetails | undefined;

  await expect
    .poll(
      async () => {
        try {
          const { data } = await kbnClient.request<ActionDetailsApiResponse>({
            method: 'GET',
            path: resolvePathVariables(ACTION_DETAILS_ROUTE, { action_id: actionId }),
            headers: PUBLIC_API_HEADERS,
            retries: 0,
          });
          latest = data.data;
          return latest.isCompleted;
        } catch (error) {
          // Throwing inside expect.poll aborts polling. Surface the error as the
          // polled value so a transient failure is retried and shown on timeout.
          return error instanceof Error ? error.message : String(error);
        }
      },
      { timeout: ACTION_TIMEOUT_MS, intervals: [2_000] }
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

const runAction = async (
  kbnClient: KbnClient,
  path: string,
  body: { endpoint_ids: string[]; parameters?: { pid: number } }
): Promise<ActionDetails> => {
  const actionId = await createAction(kbnClient, path, body);
  return waitForSuccessfulAction(kbnClient, actionId);
};

/** `systemd-run` returns immediately. A bare `sleep` would block `vagrant ssh` for the whole interval. */
export const startDisposableSleep = async (hostname: string): Promise<void> => {
  await getHostVmClient(hostname).exec('sudo systemd-run sleep 600');
};

export const listRunningProcesses = async (
  kbnClient: KbnClient,
  agentId: string
): Promise<ProcessesEntry[]> => {
  const action = (await runAction(kbnClient, GET_PROCESSES_ROUTE, {
    endpoint_ids: [agentId],
  })) as ActionDetails<GetProcessesActionOutputContent>;
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
  kbnClient: KbnClient,
  agentId: string,
  pid: number
): Promise<void> => {
  await runAction(kbnClient, KILL_PROCESS_ROUTE, {
    endpoint_ids: [agentId],
    parameters: { pid },
  });
};

export const suspendProcess = async (
  kbnClient: KbnClient,
  agentId: string,
  pid: number
): Promise<void> => {
  await runAction(kbnClient, SUSPEND_PROCESS_ROUTE, {
    endpoint_ids: [agentId],
    parameters: { pid },
  });
};
