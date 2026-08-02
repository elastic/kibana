/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest } from '@kbn/core/server';
import { getGateDefinition } from '@kbn/pnd-common';

import type { WatchWorkflowsManagementClient } from '../../../../../services/watches/watch_workflows_management_client';

/**
 * Addressing for a pending gate `_auto_respond` wants to resume. The registry
 * lookup uses `workflowId` + `stepId`; the resume uses `workflowRunId` +
 * `stepExecutionId`. `alwaysGate` and `autoApproveResponse` are deliberately
 * absent — {@link approveGate} re-reads them from the registry rather than
 * trusting a value passed in.
 */
export interface ApproveGateInput {
  stepExecutionId: string;
  stepId: string;
  workflowId: string;
  workflowRunId: string;
}

export interface ApproveGateContext {
  channel: string;
  managementClient: Pick<WatchWorkflowsManagementClient, 'resumeWorkflowExecution'>;
  rationale: string;
  request: KibanaRequest;
  spaceId: string;
}

/**
 * `resumeWorkflowExecutionExternallyWithInput` is already public on
 * `WorkflowsManagementApi` (`workflows_management_api.ts:951`), takes no
 * `KibanaRequest`, and resumes with the original workflow runner's
 * permissions — which is exactly the deterministic identity we want. Only the
 * token supply blocks it: tokens are minted solely for Slack channels
 * (`has_external_hitl_channels.ts` is hardcoded to `slack`/`slack_api`) and
 * the raw token is discarded after notification. When the platform ask lands,
 * replacing this one function body deletes the ladder, both arm steps,
 * `watch_auto_approver.yaml`, and the per-run identity limitation.
 *
 * Compensating S5 guard: independently re-reads {@link getGateDefinition}
 * immediately before the resume and refuses when `alwaysGate` is true or
 * `autoApproveResponse` is absent. The partition helper is on the primary path,
 * so it can no longer serve as the only check.
 */
export const approveGate = async (
  gate: ApproveGateInput,
  ctx: ApproveGateContext
): Promise<void> => {
  const definition = getGateDefinition(gate.workflowId, gate.stepId);

  if (definition == null || definition.alwaysGate || definition.autoApproveResponse == null) {
    throw new Error(
      `Refusing to auto-approve gate ${gate.workflowId}/${gate.stepId}: alwaysGate or autoApproveResponse is unset`
    );
  }

  const { channel, managementClient, rationale, request, spaceId } = ctx;

  await managementClient.resumeWorkflowExecution(
    gate.workflowRunId,
    spaceId,
    {
      ...definition.autoApproveResponse,
      rationale,
    },
    request,
    { channel, stepExecutionId: gate.stepExecutionId }
  );
};
