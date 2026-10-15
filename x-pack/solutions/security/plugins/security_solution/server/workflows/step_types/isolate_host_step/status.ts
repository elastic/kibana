/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ActionDetails } from '../../../../common/endpoint/types';
import type {
  IsolateHostOutput,
  IsolateHostResultStatus,
} from '../../../../common/workflows/step_types/isolate_host_step/isolate_host_step_common';

export type EndpointResult = IsolateHostOutput['results'][number];

export const toEndpointResults = (
  details: Pick<ActionDetails, 'agents' | 'agentState' | 'hosts' | 'agentType'>,
  inputIds: string[]
): EndpointResult[] =>
  inputIds.map((endpointId) => {
    const base = { endpoint_id: endpointId, agent_type: details.agentType ?? 'endpoint' };

    if (!details.agents.includes(endpointId)) {
      return { ...base, status: 'dropped' };
    }

    const hostName = details.hosts?.[endpointId]?.name;
    const state = details.agentState?.[endpointId];
    let status: IsolateHostResultStatus = 'pending';
    let error: string | undefined;

    if (state?.wasCanceled) {
      status = 'canceled';
    } else if (state?.isCompleted && state.wasSuccessful) {
      status = 'success';
    } else if (state?.isCompleted) {
      status = 'failed';
      error = state.errors?.join('; ');
    }

    return {
      ...base,
      status,
      ...(error ? { error } : {}),
      ...(hostName ? { host_name: hostName } : {}),
      ...(state?.completedAt ? { completed_at: state.completedAt } : {}),
    };
  });

/**
 * Returns the final step status, or `undefined` when polling should continue
 * (an endpoint is still pending and the deadline has not passed).
 */
export const deriveStepStatus = (
  results: EndpointResult[],
  deadlinePassed: boolean
): IsolateHostOutput['status'] | undefined => {
  const hasPending = results.some((result) => result.status === 'pending');
  if (hasPending && !deadlinePassed) {
    return undefined;
  }

  const hasSuccess = results.some((result) => result.status === 'success');
  if (hasSuccess) {
    return results.every((result) => result.status === 'success') ? 'success' : 'partial';
  }

  return hasPending ? 'timed_out' : 'failed';
};
