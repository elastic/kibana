/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ExecutionStatus } from '@kbn/workflows';
import {
  getGateDefinition,
  resolvePndWatchDefinitionId,
  type PndGateDefinition,
} from '@kbn/pnd-common';
import type { ParsedProposalSourceId } from '../../../../../lib/proposal_source_id';
import type { WatchWorkflowsManagementClient } from '../../../../../services/watches/watch_workflows_management_client';

/**
 * Outcome of resolving a `_respond` target. Each non-`ok` reason maps to a distinct
 * HTTP status in the route, and the whole resolution is what mitigates the S1
 * privilege-escalation hole: the workflow that will actually be resumed is re-derived
 * from the persisted execution, never trusted from the client-supplied source id.
 */
export type ResolveRespondTargetResult =
  | {
      /** The resumed execution's decoded `context.event` (the trigger payload), when present. */
      event: Record<string, unknown> | undefined;
      gate: PndGateDefinition;
      status: 'ok';
      stepExecutionId: string;
      workflowRunId: string;
    }
  | { status: 'forbidden_workflow' }
  | { status: 'not_found' }
  | { status: 'not_pending' }
  | { status: 'unknown_gate' };

export interface ResolveRespondTargetParams {
  managementClient: WatchWorkflowsManagementClient;
  parsed: ParsedProposalSourceId;
  spaceId: string;
}

/**
 * Resolve and authorize the pending gate a `_respond` call targets (security finding S1).
 *
 * The source id is untrusted, so the workflow id it claims is only a fast-reject hint —
 * the authoritative allow-list check runs against the workflow id **read from the
 * persisted execution**. `getWorkflowExecution` enforces exact `spaceId` equality (C7),
 * so a run in another space resolves as `not_found`. The gate must be a registered PND
 * gate and the targeted step must still be `waiting_for_input`; a stale response cannot
 * resume a later gate. First-writer-wins and the response audit stamp remain the engine's
 * job — this only decides whether the resume is allowed to be attempted at all.
 */
export const resolveRespondTarget = async ({
  managementClient,
  parsed,
  spaceId,
}: ResolveRespondTargetParams): Promise<ResolveRespondTargetResult> => {
  const execution = await managementClient.getWorkflowExecution(parsed.workflowRunId, spaceId);

  if (execution?.workflowId == null) {
    return { status: 'not_found' };
  }

  // The real S1 allow-list: reject unless the run belongs to a managed PND watch
  // (catalog id or this space's document id), regardless of what the source id claimed.
  if (resolvePndWatchDefinitionId(execution.workflowId, spaceId) == null) {
    return { status: 'forbidden_workflow' };
  }

  const step = execution.stepExecutions.find(({ id }) => id === parsed.stepExecutionId);
  if (step == null) {
    return { status: 'not_found' };
  }

  const gate = getGateDefinition(execution.workflowId, step.stepId, spaceId);
  if (gate == null) {
    return { status: 'unknown_gate' };
  }

  if (step.status !== ExecutionStatus.WAITING_FOR_INPUT) {
    return { status: 'not_pending' };
  }

  return {
    event: readEvent(execution.context),
    gate,
    status: 'ok',
    stepExecutionId: step.id,
    workflowRunId: parsed.workflowRunId,
  };
};

/** Decode a persisted execution `context.event` (unmapped, so read defensively). */
const readEvent = (
  context: Record<string, unknown> | undefined
): Record<string, unknown> | undefined => {
  const event = context?.event;
  if (event == null || typeof event !== 'object' || Array.isArray(event)) {
    return undefined;
  }
  return event as Record<string, unknown>;
};
