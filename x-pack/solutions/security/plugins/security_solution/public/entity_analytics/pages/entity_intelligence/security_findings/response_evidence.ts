/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SecurityFinding } from './types';

export interface FindingResponseEvidence {
  workflowId: string;
  executionId: string;
  triggerAlertId: string;
  triggerSessionId: string;
  runtimePrincipal: string;
  role: 'roles/storage.objectCreator';
  bucket: string;
  provider: 'google_cloud_storage';
  httpStatus: 403;
}

const identifier = /^[a-zA-Z0-9_-]{1,128}$/;
const uuid = '[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}';
const nativeResponseReceipt = new RegExp(
  `^Elastic Workflow ([a-zA-Z0-9_-]{1,128}), execution (${uuid}), was triggered by lookup alert ([a-f0-9]{64}) in session (${uuid})\\. Its native HTTP steps removed roles/storage\\.objectCreator for ` +
    `([a-zA-Z0-9_.@-]{1,254}) from ([a-z0-9][a-z0-9._-]{1,220}[a-z0-9]), ` +
    `with Google HTTP 200 and IAM readback\\. This later export call received Google Storage HTTP 403;`
);

/** Extracts the native publisher's immutable response receipt without inferring links from time or names. */
export const getFindingResponse = (
  finding: SecurityFinding
): FindingResponseEvidence | undefined => {
  const { policy, invocation, agent } = finding;
  if (
    finding.outcome !== 'blocked' ||
    policy?.engine !== 'elastic_workflows.google_storage_iam' ||
    policy.mode !== 'enforce' ||
    policy.decision !== 'deny' ||
    agent?.provider !== 'google_adk' ||
    !agent.sessionId ||
    invocation?.correlation !== 'exact_native_observation' ||
    invocation.operationOutcome !== 'failure' ||
    !policy.reason
  )
    return undefined;

  const receipt = nativeResponseReceipt.exec(policy.reason);
  if (!receipt) return undefined;
  const [, workflowId, executionId, triggerAlertId, triggerSessionId, runtimePrincipal, bucket] =
    receipt;
  if (
    invocation.runtimePrincipal !== runtimePrincipal ||
    triggerSessionId === agent.sessionId ||
    !finding.target?.startsWith(`gs://${bucket}/`)
  )
    return undefined;

  return {
    workflowId,
    executionId,
    triggerAlertId,
    triggerSessionId,
    runtimePrincipal,
    role: 'roles/storage.objectCreator',
    bucket,
    provider: 'google_cloud_storage',
    httpStatus: 403,
  };
};

/** Builds an internal execution route from validated identifiers, never a source-provided URL. */
export const workflowExecutionPath = (
  response: Pick<FindingResponseEvidence, 'workflowId' | 'executionId'>
): string => {
  if (!identifier.test(response.workflowId) || !identifier.test(response.executionId)) {
    throw new Error('Invalid workflow execution identifiers.');
  }
  return `/${encodeURIComponent(
    response.workflowId
  )}?tab=executions&executionId=${encodeURIComponent(response.executionId)}`;
};
