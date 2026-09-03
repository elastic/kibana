/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { HttpServiceStart, KibanaRequest, Logger } from '@kbn/core/server';
import { PND_GATE_STEP_IDS, SYSTEM_SECURITY_WATCH_POST_INCIDENT_ID } from '@kbn/pnd-common';
import { readCorrelationIdFromExecutionContext } from '@kbn/workflows/managed';

import { extractGateAnswer } from '../../../../../lib/extract_gate_answer';
import { listAnsweredPndGates } from '../../../../../lib/list_answered_pnd_gates';
import { parseProposalSourceId } from '../../../../../lib/proposal_source_id';
import type { WatchWorkflowsManagementClient } from '../../../../../services/watches/watch_workflows_management_client';
import { findAttackDiscoveryAlerts } from '../../../../get/conversations/helpers/find_attack_discovery_alerts';

/**
 * Outcome of binding `_apply` to an approved Post-Incident tuning gate. Every non-`ok` reason
 * maps to a 404 at the route — a missing run, a dismissed gate, and an unreadable discovery
 * must not be distinguishable (S3).
 */
export type ResolveApprovedTuningTargetResult =
  | { status: 'ok' }
  | { status: 'forbidden_workflow' }
  | { status: 'not_approved' }
  | { status: 'not_found' }
  | { status: 'unreadable_discovery' };

export interface ResolveApprovedTuningTargetParams {
  http: HttpServiceStart;
  logger: Logger;
  managementClient: WatchWorkflowsManagementClient;
  /** Attack Discovery id, or a `workflowId:workflowRunId:stepExecutionId` source id. */
  proposalId: string;
  request: KibanaRequest;
  /** Space resolved from the request (S9); never a client value. */
  spaceId: string;
}

/**
 * Bind `POST /internal/pnd/tuning/{proposalId}/_apply` to an answered, approved
 * `await_apply_tuning` gate on the Post-Incident watch.
 *
 * The UI responds first, then applies, so the gate is no longer pending when this route runs.
 * A holder of `RULES_API_ALL` must not patch a detection rule for a gate that was never
 * approved, or for a run that is not Post-Incident.
 */
export const resolveApprovedTuningTarget = async ({
  http,
  logger,
  managementClient,
  proposalId,
  request,
  spaceId,
}: ResolveApprovedTuningTargetParams): Promise<ResolveApprovedTuningTargetResult> => {
  const parsed = parseProposalSourceId(proposalId);

  if (parsed != null) {
    return resolveFromSourceId({
      http,
      managementClient,
      parsed,
      request,
      spaceId,
    });
  }

  return resolveFromCorrelationId({
    http,
    logger,
    managementClient,
    proposalId,
    request,
    spaceId,
  });
};

const resolveFromSourceId = async ({
  http,
  managementClient,
  parsed,
  request,
  spaceId,
}: {
  http: HttpServiceStart;
  managementClient: WatchWorkflowsManagementClient;
  parsed: NonNullable<ReturnType<typeof parseProposalSourceId>>;
  request: KibanaRequest;
  spaceId: string;
}): Promise<ResolveApprovedTuningTargetResult> => {
  const execution = await managementClient.getWorkflowExecution(parsed.workflowRunId, spaceId, {
    includeInput: true,
    includeOutput: true,
  });

  if (execution?.workflowId == null) {
    return { status: 'not_found' };
  }

  if (execution.workflowId !== SYSTEM_SECURITY_WATCH_POST_INCIDENT_ID) {
    return { status: 'forbidden_workflow' };
  }

  const step = execution.stepExecutions?.find(
    (candidate) => candidate.id === parsed.stepExecutionId
  );

  if (step == null || step.stepId !== PND_GATE_STEP_IDS.awaitApplyTuning) {
    return { status: 'not_found' };
  }

  const answer = extractGateAnswer(step);
  if (answer?.decision !== 'approve') {
    return { status: 'not_approved' };
  }

  const correlationId = readCorrelationIdFromExecutionContext(execution.context);
  if (correlationId === '') {
    return { status: 'ok' };
  }

  return assertReadableDiscovery({ correlationId, http, request, spaceId });
};

const resolveFromCorrelationId = async ({
  http,
  logger,
  managementClient,
  proposalId,
  request,
  spaceId,
}: {
  http: HttpServiceStart;
  logger: Logger;
  managementClient: WatchWorkflowsManagementClient;
  proposalId: string;
  request: KibanaRequest;
  spaceId: string;
}): Promise<ResolveApprovedTuningTargetResult> => {
  const { answerByStepId, attackDiscoveryIdByRunId, results } = await listAnsweredPndGates({
    logger,
    managementClient,
    spaceId,
    watchIds: [SYSTEM_SECURITY_WATCH_POST_INCIDENT_ID],
  });

  const approved = results.find((step) => {
    if (step.stepId !== PND_GATE_STEP_IDS.awaitApplyTuning) {
      return false;
    }
    if (answerByStepId.get(step.id)?.decision !== 'approve') {
      return false;
    }
    return attackDiscoveryIdByRunId.get(step.workflowRunId) === proposalId;
  });

  if (approved == null) {
    return { status: 'not_found' };
  }

  return assertReadableDiscovery({ correlationId: proposalId, http, request, spaceId });
};

const assertReadableDiscovery = async ({
  correlationId,
  http,
  request,
  spaceId,
}: {
  correlationId: string;
  http: HttpServiceStart;
  request: KibanaRequest;
  spaceId: string;
}): Promise<ResolveApprovedTuningTargetResult> => {
  const [alert] = await findAttackDiscoveryAlerts({
    http,
    ids: [correlationId],
    request,
    spaceId,
  });

  if (alert == null) {
    return { status: 'unreadable_discovery' };
  }

  return { status: 'ok' };
};
