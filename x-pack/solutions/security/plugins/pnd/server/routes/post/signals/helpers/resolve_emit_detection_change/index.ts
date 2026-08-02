/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { HttpServiceStart, KibanaRequest } from '@kbn/core/server';
import { SYSTEM_SECURITY_WATCH_FLOOR_ID } from '@kbn/pnd-common';
import { readCorrelationIdFromExecutionContext } from '@kbn/workflows/managed';

import type { WatchWorkflowsManagementClient } from '../../../../../services/watches/watch_workflows_management_client';
import { findAttackDiscoveryAlerts } from '../../../../get/conversations/helpers/find_attack_discovery_alerts';

/**
 * Outcome of authorizing a standalone coverage-gap emit. Each non-`ok` reason maps to a 404 at the
 * route — existence of another space's run, a non-Floor producer, or an unreadable discovery must
 * not be distinguishable (S3).
 */
export type ResolveEmitDetectionChangeTargetResult =
  | { event: Record<string, unknown> | undefined; status: 'ok' }
  | { status: 'correlation_mismatch' }
  | { status: 'forbidden_workflow' }
  | { status: 'not_found' }
  | { status: 'unreadable_discovery' };

export interface ResolveEmitDetectionChangeTargetParams {
  /** Attack Discovery id the caller claims the Floor run concluded. */
  correlationId: string;
  http: HttpServiceStart;
  managementClient: WatchWorkflowsManagementClient;
  request: KibanaRequest;
  /** Workflow execution id the Floor YAML stamps as `{{ execution.id }}`. */
  sourceRunId: string;
  /** Space resolved from the request (S9); never a client value. */
  spaceId: string;
}

/**
 * Authorize `POST /internal/pnd/signals/_detection_change` against the persisted Floor run.
 *
 * The body is untrusted: a holder of the respond privilege must not wake Post-Incident by inventing
 * a `sourceRunId` or pairing a real Floor run with a different discovery. The execution is
 * re-read in the request space, must belong to Watch Floor, and must carry the same correlation id
 * the body claims. The discovery is then resolved as the caller (S3) — an unreadable one is refused
 * rather than emitted with empty tactics.
 */
export const resolveEmitDetectionChangeTarget = async ({
  correlationId,
  http,
  managementClient,
  request,
  sourceRunId,
  spaceId,
}: ResolveEmitDetectionChangeTargetParams): Promise<ResolveEmitDetectionChangeTargetResult> => {
  const execution = await managementClient.getWorkflowExecution(sourceRunId, spaceId);

  if (execution?.workflowId == null) {
    return { status: 'not_found' };
  }

  if (execution.workflowId !== SYSTEM_SECURITY_WATCH_FLOOR_ID) {
    return { status: 'forbidden_workflow' };
  }

  const event = readEvent(execution.context);
  const executionCorrelationId = readCorrelationIdFromExecutionContext(execution.context);

  if (executionCorrelationId !== correlationId) {
    return { status: 'correlation_mismatch' };
  }

  const [alert] = await findAttackDiscoveryAlerts({
    http,
    ids: [correlationId],
    request,
    spaceId,
  });

  if (alert == null) {
    return { status: 'unreadable_discovery' };
  }

  return { event, status: 'ok' };
};

const readEvent = (
  context: Record<string, unknown> | undefined
): Record<string, unknown> | undefined => {
  const event = context?.event;
  if (event == null || typeof event !== 'object' || Array.isArray(event)) {
    return undefined;
  }
  return event as Record<string, unknown>;
};
