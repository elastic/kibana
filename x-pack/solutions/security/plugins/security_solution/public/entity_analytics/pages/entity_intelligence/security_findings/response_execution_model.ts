/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FindingResponseEvidence } from './response_evidence';

export type ExecutionValue =
  | null
  | boolean
  | number
  | string
  | ExecutionValue[]
  | { [key: string]: ExecutionValue | undefined };
interface ExecutionRecord {
  [key: string]: ExecutionValue | undefined;
}

export type ResponseExecutionStatus =
  | 'completed'
  | 'failed'
  | 'cancelled'
  | 'timed_out'
  | 'skipped'
  | 'running'
  | 'pending'
  | 'waiting'
  | 'waiting_for_input'
  | 'waiting_for_child'
  | 'queued';

export interface ResponseExecutionStep {
  id:
    | 'read_current_export_bucket_iam'
    | 'revoke_agent_export_permission'
    | 'read_back_google_iam_policy';
  status: ResponseExecutionStatus;
  method?: 'GET' | 'PUT';
  httpStatus?: number;
  duration?: number;
}

export interface ResponseExecution {
  id: string;
  workflowId: string;
  name: string;
  status: ResponseExecutionStatus;
  startedAt?: string;
  finishedAt?: string;
  duration?: number;
  steps: ResponseExecutionStep[];
  permissionRemoved: boolean;
}

const record = (value: ExecutionValue | undefined): ExecutionRecord | undefined =>
  value !== null && typeof value === 'object' && !Array.isArray(value) ? value : undefined;
const text = (value: ExecutionValue | undefined, max = 256): string | undefined =>
  typeof value === 'string' && value.length > 0 && value.length <= max ? value : undefined;
const status = (value: ExecutionValue | undefined): ResponseExecutionStatus | undefined => {
  switch (value) {
    case 'completed':
    case 'failed':
    case 'cancelled':
    case 'timed_out':
    case 'skipped':
    case 'running':
    case 'pending':
    case 'waiting':
    case 'waiting_for_input':
    case 'waiting_for_child':
    case 'queued':
      return value;
    default:
      return undefined;
  }
};
const duration = (value: ExecutionValue | undefined): number | undefined =>
  typeof value === 'number' && Number.isFinite(value) && value >= 0 ? value : undefined;

const hasGrant = (
  data: ExecutionRecord | undefined,
  receipt: FindingResponseEvidence
): boolean | undefined => {
  if (
    data?.resourceId !== `projects/_/buckets/${receipt.bucket}` ||
    !Array.isArray(data.bindings) ||
    data.bindings.length > 512
  )
    return undefined;
  let granted = false;
  for (const item of data.bindings) {
    const binding = record(item);
    if (
      !binding ||
      typeof binding.role !== 'string' ||
      !Array.isArray(binding.members) ||
      binding.members.length > 2048 ||
      binding.members.some((member) => typeof member !== 'string')
    )
      return undefined;
    if (
      binding.role === receipt.role &&
      binding.members.includes(`serviceAccount:${receipt.runtimePrincipal}`)
    )
      granted = true;
  }
  return granted;
};

/** Projects only verified execution metadata and the response's three Google HTTP steps. */
export const toResponseExecution = (
  value: ExecutionValue,
  receipt: FindingResponseEvidence,
  spaceId: string
): ResponseExecution => {
  const execution = record(value);
  const executionStatus = status(execution?.status);
  const context = record(execution?.context);
  const alerts = record(context?.event)?.alerts;
  if (
    !execution ||
    execution.id !== receipt.executionId ||
    execution.workflowId !== receipt.workflowId ||
    execution.spaceId !== spaceId ||
    execution.isTestRun !== false ||
    execution.triggeredBy !== 'alert' ||
    !executionStatus ||
    !Array.isArray(alerts) ||
    alerts.length > 1000 ||
    !alerts.some((item) => {
      const alert = record(item);
      const agent = record(record(alert?.entity_intelligence)?.agent);
      return (
        alert?._id === receipt.triggerAlertId &&
        agent?.provider === 'google_adk' &&
        agent.session_id === receipt.triggerSessionId
      );
    }) ||
    !Array.isArray(execution.stepExecutions) ||
    execution.stepExecutions.length > 1000
  )
    throw new Error('The workflow execution does not match the recorded response.');

  const ids: ResponseExecutionStep['id'][] = [
    'read_current_export_bucket_iam',
    'revoke_agent_export_permission',
    'read_back_google_iam_policy',
  ];
  const projected: ResponseExecutionStep[] = [];
  const iam: Array<ExecutionRecord | undefined> = [];
  const executionSteps = execution.stepExecutions.map(record);
  ids.forEach((id) => {
    const matches = executionSteps.filter((step) => step?.stepId === id);
    if (matches.length !== 1) return;
    const step = matches[0];
    const stepStatus = status(step?.status);
    if (
      !step ||
      !stepStatus ||
      step.stepType !== 'http' ||
      step.workflowRunId !== execution.id ||
      step.workflowId !== execution.workflowId ||
      step.spaceId !== spaceId ||
      step.isTestRun === true
    )
      return;
    const input = record(step.input);
    const output = record(step.output);
    projected.push({
      id,
      status: stepStatus,
      method: input?.method === 'GET' || input?.method === 'PUT' ? input.method : undefined,
      httpStatus:
        typeof output?.status === 'number' &&
        Number.isInteger(output.status) &&
        output.status >= 100 &&
        output.status <= 599
          ? output.status
          : undefined,
      duration: duration(step.executionTimeMs),
    });
    iam[ids.indexOf(id)] = record(output?.data);
  });
  const [before, written, after] = iam;
  const output = record(context?.output);
  const startedAt = text(execution.startedAt, 40);
  const finishedAt = text(execution.finishedAt, 40);
  return {
    id: receipt.executionId,
    workflowId: receipt.workflowId,
    name: text(record(execution.workflowDefinition)?.name) ?? receipt.workflowId,
    status: executionStatus,
    startedAt: startedAt && Number.isFinite(Date.parse(startedAt)) ? startedAt : undefined,
    finishedAt:
      finishedAt &&
      Number.isFinite(Date.parse(finishedAt)) &&
      (!startedAt ||
        !Number.isFinite(Date.parse(startedAt)) ||
        Date.parse(startedAt) <= Date.parse(finishedAt))
        ? finishedAt
        : undefined,
    duration: duration(execution.duration),
    steps: projected,
    permissionRemoved:
      executionStatus === 'completed' &&
      projected.length === 3 &&
      projected.every((step) => step.status === 'completed' && step.httpStatus === 200) &&
      projected[0].method === 'GET' &&
      projected[1].method === 'PUT' &&
      projected[2].method === 'GET' &&
      hasGrant(before, receipt) === true &&
      hasGrant(written, receipt) === false &&
      hasGrant(after, receipt) === false &&
      Boolean(
        text(before?.etag) &&
          text(after?.etag) &&
          before?.etag !== after?.etag &&
          written?.etag === after?.etag
      ) &&
      output?.action === 'revoke_export_permission' &&
      output.bucket === receipt.bucket &&
      output.runtime_principal === receipt.runtimePrincipal &&
      output.removed_role === receipt.role &&
      output.iam_policy_change_verified === true,
  };
};
