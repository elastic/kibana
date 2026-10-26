/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SYSTEM_SECURITY_WORKER_IDS } from '@kbn/alertzero-common';
import type { Logger } from '@kbn/core/server';
import type { WorkflowExecutionDto, WorkflowYaml } from '@kbn/workflows';
import { isTopLevelWorkflowExecution } from '@kbn/workflows';
import { ALERTZERO_MANAGED_WORKFLOW_OWNER_ID } from '../../../common/constants';
import type { AlertZeroEnvelopeRoot } from '../../telemetry';
import { describeError } from './describe_error';
import { getParentExecutionId } from './get_parent_execution_id';
import type { ExecutionChainHop } from './parse_execution_chain';
import { parseExecutionChain } from './parse_execution_chain';
import type { ReportWorkerOutcomeSkipReason } from './skip_reasons';
import { withTimeout } from './with_timeout';

/** Ancestors a reporting execution's chain may list; matches the engine's default `maxWorkflowDepth`. */
export const MAX_LINEAGE_HOPS = 10;

/** The persisted execution fields the verification reads. A management `WorkflowExecutionDto` fits. */
export type WorkerChainExecution = Pick<
  WorkflowExecutionDto,
  | 'context'
  | 'id'
  | 'isTestRun'
  | 'managed'
  | 'managedBy'
  | 'originManagedWorkflowId'
  | 'spaceId'
  | 'triggeredBy'
> & {
  workflowDefinition?: Pick<WorkflowYaml, 'consts'> | null;
  workflowId?: string;
};

export type WorkerChainVerification =
  | { root: AlertZeroEnvelopeRoot; verified: true }
  | { reason: ReportWorkerOutcomeSkipReason; verified: false };

export interface VerifyWorkerChainParams {
  abortSignal: AbortSignal;
  /** The reporting execution; its persisted context lists its ancestors. */
  executionId: string;
  /** Reads one persisted execution in `spaceId`, or `null` when it is missing or hidden. */
  getExecution: (executionId: string) => Promise<WorkerChainExecution | null>;
  hopTimeoutMs: number;
  /** Says at debug why a read failed; the caller logs only the skip reason. */
  logger: Logger;
  spaceId: string;
}

const skip = (reason: ReportWorkerOutcomeSkipReason): WorkerChainVerification => ({
  reason,
  verified: false,
});

const isCatalogWorkerId = (id: string | null | undefined): boolean =>
  id != null && (SYSTEM_SECURITY_WORKER_IDS as readonly string[]).includes(id);

/** Keeps only what the envelope reads, not the whole workflow definition. */
const toEnvelopeRoot = ({
  context,
  id,
  originManagedWorkflowId,
  spaceId,
  triggeredBy,
  workflowDefinition,
}: WorkerChainExecution): AlertZeroEnvelopeRoot => ({
  context,
  id,
  originManagedWorkflowId,
  spaceId,
  triggeredBy,
  workflowDefinition: { consts: workflowDefinition?.consts },
});

const readExecution = async (
  { abortSignal, getExecution, hopTimeoutMs, logger }: VerifyWorkerChainParams,
  executionId: string
): Promise<WorkerChainExecution | null> => {
  try {
    return await withTimeout(getExecution(executionId), hopTimeoutMs, abortSignal);
  } catch (error) {
    if (!abortSignal.aborted) {
      logger.debug(() => `Could not read execution ${executionId}: ${describeError(error)}`);
    }
    return null;
  }
};

/** Why a persisted hop disqualifies the chain, if it does. */
const checkHop = (
  execution: WorkerChainExecution,
  spaceId: string
): ReportWorkerOutcomeSkipReason | undefined => {
  // The execution search also matches legacy documents with no `spaceId`, so compare explicitly.
  if (execution.spaceId !== spaceId) {
    return 'lineage_unavailable';
  }
  if (execution.isTestRun) {
    return 'test_run';
  }
  if (!execution.managed || execution.managedBy !== ALERTZERO_MANAGED_WORKFLOW_OWNER_ID) {
    return 'not_managed';
  }
  return undefined;
};

/** Why an ancestor read for `hop` disqualifies the chain, if it does. */
const checkAncestor = (
  execution: WorkerChainExecution | null,
  hop: ExecutionChainHop,
  spaceId: string
): ReportWorkerOutcomeSkipReason | undefined =>
  !execution || execution.id !== hop.executionId || execution.workflowId !== hop.workflowId
    ? 'lineage_unavailable'
    : checkHop(execution, spaceId);

/** The root, once every execution of the chain has passed its checks. */
const verifiedRoot = (root: WorkerChainExecution): WorkerChainVerification =>
  isCatalogWorkerId(root.originManagedWorkflowId)
    ? { root: toEnvelopeRoot(root), verified: true }
    : skip('not_catalog_root');

/**
 * Verifies a reporting execution's ancestors, requiring every one to be a non-test execution
 * AlertZero manages in the same space, and the root to be a catalog Worker. The ancestors come
 * from the `executionChain` the Workflows engine stores in a child's context, so they are read in
 * one parallel batch after one read of the reporting execution. A child without a valid chain (it
 * started before the engine recorded chains) is not verified. The caller check is best-effort.
 */
export const verifyWorkerChain = async (
  params: VerifyWorkerChainParams
): Promise<WorkerChainVerification> => {
  const { abortSignal, executionId, spaceId } = params;
  if (abortSignal.aborted) {
    return skip('aborted');
  }

  const execution = await readExecution(params, executionId);
  if (abortSignal.aborted) {
    return skip('aborted');
  }
  if (!execution || execution.id !== executionId) {
    return skip('lineage_unavailable');
  }
  const failure = checkHop(execution, spaceId);
  if (failure) {
    return skip(failure);
  }
  if (isTopLevelWorkflowExecution(execution)) {
    return verifiedRoot(execution);
  }

  const chain = parseExecutionChain(execution.context, MAX_LINEAGE_HOPS);
  const parent = chain?.[chain.length - 1];
  if (
    !chain ||
    !parent ||
    parent.executionId !== getParentExecutionId(execution.context) ||
    chain.some((hop) => hop.executionId === executionId)
  ) {
    return skip('lineage_unavailable');
  }

  const ancestors = await Promise.all(chain.map((hop) => readExecution(params, hop.executionId)));
  if (abortSignal.aborted) {
    return skip('aborted');
  }
  // Nearest ancestor first, so a skip names the hop closest to the reporting execution.
  const ancestorFailure = chain
    .map((hop, index) => checkAncestor(ancestors[index], hop, spaceId))
    .reverse()
    .find((reason) => reason !== undefined);
  if (ancestorFailure) {
    return skip(ancestorFailure);
  }
  const [root] = ancestors;
  if (!root || !isTopLevelWorkflowExecution(root)) {
    return skip('lineage_unavailable');
  }
  return verifiedRoot(root);
};
