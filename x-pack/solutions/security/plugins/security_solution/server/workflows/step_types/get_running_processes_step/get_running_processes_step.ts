/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  createPollServerStepDefinition,
  KibanaApiCallError,
} from '@kbn/workflows-extensions/server';
import { z, lazySchema } from '@kbn/zod/v4';
import { ACTION_DETAILS_ROUTE, GET_PROCESSES_ROUTE } from '../../../../common/endpoint/constants';
import type {
  ActionDetails,
  GetProcessesActionOutputContent,
} from '../../../../common/endpoint/types';
import { getRunningProcessesStepCommonDefinition } from '../../../../common/workflows/step_types/get_running_processes_step/get_running_processes_step_common';
import type { GetRunningProcessesOutput } from '../../../../common/workflows/step_types/get_running_processes_step/get_running_processes_step_common';
import { deriveStepStatus, toEndpointResults } from '../isolate_host_step/status';

const DEFAULT_WAIT_MS = 5 * 60 * 1000;
const MAX_WAIT_MS = 60 * 60 * 1000;
const DEFAULT_MAX_PROCESSES = 100;
const UNIT_MS = { s: 1000, m: 60 * 1000, h: 60 * 60 * 1000 } as const;

const parseWaitTimeoutMs = (waitTimeout: string | undefined): number => {
  const match = waitTimeout?.match(/^([1-9][0-9]*)(s|m|h)$/);
  if (!match) {
    return DEFAULT_WAIT_MS;
  }
  return Math.min(Number(match[1]) * UNIT_MS[match[2] as keyof typeof UNIT_MS], MAX_WAIT_MS);
};

const stateSchema = lazySchema(() =>
  z.object({
    action_id: z.string(),
    deadline: z.string(),
    started_at: z.string(),
    endpoint_ids: z.array(z.string()),
    max_processes: z.number(),
  })
);

const rejection = (error: KibanaApiCallError): Error => {
  const body = error.body as { message?: string } | undefined;
  return new Error(
    `Running-processes request rejected (HTTP ${error.status}): ${body?.message ?? error.message}`
  );
};

export const getRunningProcessesStepDefinition = createPollServerStepDefinition({
  ...getRunningProcessesStepCommonDefinition,
  stateSchema,
  start: async (context) => {
    const { input } = context;
    const startedAt = new Date().toISOString();

    try {
      const { body } = await context.contextManager.callKibanaApi<{ data: ActionDetails }>({
        method: 'POST',
        path: GET_PROCESSES_ROUTE,
        body: {
          endpoint_ids: input.endpoint_ids,
          comment: input.comment,
          alert_ids: input.alert_ids,
          case_ids: input.case_ids,
          agent_type: 'endpoint',
        },
      });

      return {
        state: {
          action_id: body.data.id,
          deadline: new Date(Date.now() + parseWaitTimeoutMs(input.wait_timeout)).toISOString(),
          started_at: startedAt,
          endpoint_ids: input.endpoint_ids,
          max_processes: input.max_processes ?? DEFAULT_MAX_PROCESSES,
        },
      };
    } catch (error) {
      // 4xx: the route rejected the request, nothing was created.
      if (error instanceof KibanaApiCallError && error.status >= 400 && error.status < 500) {
        return { error: rejection(error) };
      }

      // Timeout / 5xx / network: an action may or may not exist. Never retry the POST.
      context.logger.warn(`Running-processes dispatch unconfirmed: ${(error as Error).message}`);
      const output: GetRunningProcessesOutput = {
        status: 'failed',
        error_code: 'DISPATCH_UNCONFIRMED',
        action_ids: [],
        results: [],
        dropped_endpoint_ids: [],
        started_at: startedAt,
      };
      return { output };
    }
  },
  poll: async (context) => {
    const { state } = context;
    if (!state) {
      throw new Error('Poll ran before start() seeded durable state.');
    }

    const deadlinePassed = Date.now() >= new Date(state.deadline).getTime();
    let details: ActionDetails | undefined;

    try {
      const { body } = await context.contextManager.callKibanaApi<{ data: ActionDetails }>({
        method: 'GET',
        path: ACTION_DETAILS_ROUTE.replace('{action_id}', encodeURIComponent(state.action_id)),
      });
      details = body.data;
    } catch (error) {
      // The action was dispatched but this user cannot read its status (the details route needs
      // the response actions history privilege): waiting out the deadline would only report a
      // misleading `timed_out`.
      if (error instanceof KibanaApiCallError && (error.status === 401 || error.status === 403)) {
        const output: GetRunningProcessesOutput = {
          status: 'failed',
          error_code: 'STATUS_UNREADABLE_FORBIDDEN',
          action_ids: [state.action_id],
          results: state.endpoint_ids.map((endpointId) => ({
            endpoint_id: endpointId,
            agent_type: 'endpoint',
            status: 'pending' as const,
          })),
          dropped_endpoint_ids: [],
          started_at: state.started_at,
        };
        return { output };
      }

      // Never error after dispatch: keep polling until the deadline.
      context.logger.warn(
        `Running-processes action ${state.action_id} poll failed: ${(error as Error).message}`
      );
    }

    const baseResults = details ? toEndpointResults(details, state.endpoint_ids) : undefined;
    const status = baseResults
      ? deriveStepStatus(baseResults, deadlinePassed)
      : deadlinePassed
      ? 'timed_out'
      : undefined;

    if (status === undefined) {
      return { state };
    }

    const results: GetRunningProcessesOutput['results'] = baseResults
      ? baseResults.map((result) => {
          const content = details?.outputs?.[result.endpoint_id]?.content as
            | GetProcessesActionOutputContent
            | undefined;
          const entries = content?.entries;
          if (result.status !== 'success' || !entries) {
            return result;
          }
          return {
            ...result,
            process_count: entries.length,
            processes: entries.slice(0, state.max_processes).map((entry) => ({
              pid: String(entry.pid),
              user: entry.user,
              command: entry.command,
              ...(entry.entity_id ? { entity_id: entry.entity_id } : {}),
            })),
          };
        })
      : state.endpoint_ids.map((endpointId) => ({
          endpoint_id: endpointId,
          agent_type: 'endpoint',
          status: 'pending' as const,
        }));

    const output: GetRunningProcessesOutput = {
      status,
      action_ids: [state.action_id],
      results,
      dropped_endpoint_ids: results
        .filter((result) => result.status === 'dropped')
        .map((result) => result.endpoint_id),
      started_at: state.started_at,
    };
    return { output };
  },
  policy: { strategy: 'exponential', initialMs: 5000, maxMs: 30000, jitter: true },
  // Both fields are always set: omitting one falls back to the default (60 attempts).
  ceilings: { maxAttempts: 250, maxWaitMs: 30000 },
});
