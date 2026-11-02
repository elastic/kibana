/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { lazySchema, z } from '@kbn/zod/v4';
import type { WorkflowExecutionListDto, WorkflowExecutionListItemDto } from '@kbn/workflows';
import { ExecutionStatus, ExecutionType } from '@kbn/workflows';
import {
  NIGHTSHIFT_BOUND_INVESTIGATION_WORKFLOW_ID,
  NIGHTSHIFT_INVESTIGATION_WORKFLOW_ID,
  NIGHTSHIFT_INVESTIGATION_FAILURE_SWEEP_WORKFLOW_ID,
} from '@kbn/workflows/managed';
import type { GetTriggerEmitter } from '../types';
import type { GetWorkflowsManagement } from '../routes/types';
import type {
  InvestigationNotificationDeps,
  InvestigationNotificationSource,
} from './notifications/send_investigation_notifications';
import { isInvestigationWorkflowExecution } from './managed_workflows/is_investigation_workflow_execution';
import { reportUnsuccessfulInvestigation } from './report_unsuccessful_investigation';

export const FAILURE_SWEEP_BATCH_SIZE = 100;
// Overlap the five-minute schedule to tolerate scheduling and persistence delays.
const RECENT_FAILURE_LOOKBACK_MS = 10 * 60_000;
const checkpointSchema = lazySchema(() =>
  z.object({
    through: z.iso.datetime().optional(),
    after_id: z.string().min(1).max(500).optional(),
  })
);
export const investigationFailureSweepOutputSchema = lazySchema(() =>
  z.object({
    checked: z.number(),
    errors: z.number(),
    checkpoint: checkpointSchema,
  })
);

type Checkpoint = z.infer<typeof checkpointSchema>;
type SweepResult = z.infer<typeof investigationFailureSweepOutputSchema>;
type SweepContext = Omit<InvestigationNotificationSource, 'executionId'> & { workflowId: string };
export type InvestigationFailureSweepDeps = InvestigationNotificationDeps & {
  getTriggerEmitter: GetTriggerEmitter;
  getWorkflowsManagement: GetWorkflowsManagement;
};
interface SweepScope {
  management: NonNullable<ReturnType<GetWorkflowsManagement>>['management'];
  request: SweepContext['request'];
  spaceId: string;
  workflowId: string;
}
interface CandidateQuery {
  finishedAfter: string;
  finishedBefore: string;
  afterId?: string;
  recent?: boolean;
}
interface BatchProgress {
  scanned: number;
  afterId?: string;
}
interface BatchReporter {
  counts: Pick<SweepResult, 'checked' | 'errors'>;
  reportBatch: (candidates: WorkflowExecutionListItemDto[]) => Promise<BatchProgress>;
}

const validateSweepWorkflow = async ({
  management,
  request,
  spaceId,
  workflowId,
}: SweepScope): Promise<string> => {
  const installed = await management.getWorkflow(workflowId, spaceId, request);
  if (
    !installed ||
    installed.originManagedWorkflowId !== NIGHTSHIFT_INVESTIGATION_FAILURE_SWEEP_WORKFLOW_ID
  ) {
    throw new Error('Failure reconciliation must run from the managed sweep workflow');
  }
  return installed.createdAt;
};

const loadCheckpoint = async ({
  management,
  request,
  spaceId,
  workflowId,
}: SweepScope): Promise<Checkpoint> => {
  const previous = await management.getWorkflowExecutions(
    {
      request,
      workflowId,
      statuses: [ExecutionStatus.COMPLETED],
      executionTypes: [ExecutionType.PRODUCTION],
      omitStepRuns: true,
      sortField: 'createdAt',
      sortOrder: 'desc',
      size: 1,
    },
    spaceId
  );
  const last = previous.results[0];
  if (!last) return {};
  const lastRun = await management.getWorkflowExecution(last.id, spaceId, {
    request,
    includeOutput: true,
    omitStepExecutions: true,
  });
  const output = investigationFailureSweepOutputSchema.safeParse(lastRun?.context?.output);
  return output.success ? output.data.checkpoint : {};
};

const readFailureCandidates = (
  { management, request, spaceId }: SweepScope,
  { finishedAfter, finishedBefore, afterId, recent }: CandidateQuery
): Promise<WorkflowExecutionListDto> =>
  management.searchExecutionsView(
    {
      request,
      includeManagedExecutions: true,
      statuses: [ExecutionStatus.FAILED, ExecutionStatus.TIMED_OUT],
      executionTypes: [ExecutionType.PRODUCTION],
      finishedAfter,
      finishedBefore,
      sortField: recent ? 'finishedAt' : 'id',
      sortOrder: recent ? 'desc' : 'asc',
      size: FAILURE_SWEEP_BATCH_SIZE,
      query: {
        bool: {
          filter: [
            {
              bool: {
                should: [
                  { term: { workflowId: NIGHTSHIFT_INVESTIGATION_WORKFLOW_ID } },
                  {
                    terms: {
                      originManagedWorkflowId: [
                        NIGHTSHIFT_INVESTIGATION_WORKFLOW_ID,
                        NIGHTSHIFT_BOUND_INVESTIGATION_WORKFLOW_ID,
                      ],
                    },
                  },
                ],
                minimum_should_match: 1,
              },
            },
            ...(afterId ? [{ range: { id: { gt: afterId } } }] : []),
          ],
        },
      },
    },
    spaceId
  );

const createBatchReporter = (
  deps: InvestigationFailureSweepDeps,
  context: SweepContext
): BatchReporter => {
  const visited = new Set<string>();
  const counts = { checked: 0, errors: 0 };
  const reportCandidate = async (candidate: WorkflowExecutionListItemDto): Promise<void> => {
    if (visited.has(candidate.id)) return;
    visited.add(candidate.id);
    try {
      if (isInvestigationWorkflowExecution(candidate)) {
        await reportUnsuccessfulInvestigation(deps, { ...context, executionId: candidate.id });
      }
    } catch (error) {
      counts.errors++;
      context.logger.warn(
        `Could not reconcile investigation execution ${candidate.id}: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    }
    counts.checked++;
  };
  const reportBatch = async (
    candidates: WorkflowExecutionListItemDto[]
  ): Promise<BatchProgress> => {
    let scanned = 0;
    let afterId: string | undefined;
    for (const candidate of candidates) {
      if (context.abortSignal.aborted) break;
      await reportCandidate(candidate);
      scanned++;
      afterId = candidate.id;
    }
    return { scanned, afterId };
  };
  return { counts, reportBatch };
};

/** Reconciles bounded history and recent-failure batches, retaining only history progress in the checkpoint. */
export const sweepInvestigationFailures = async (
  deps: InvestigationFailureSweepDeps,
  context: SweepContext
): Promise<SweepResult> => {
  const management = deps.getWorkflowsManagement()?.management;
  if (!management) throw new Error('Workflows management is unavailable');
  const scope = {
    management,
    request: context.request,
    spaceId: context.spaceId,
    workflowId: context.workflowId,
  };
  const createdAt = await validateSweepWorkflow(scope);
  const checkpoint = await loadCheckpoint(scope);
  // Revisit retained failures after each fixed-window pass, including late recovery writes.
  const through = checkpoint.through ?? new Date().toISOString();
  const history = await readFailureCandidates(scope, {
    finishedAfter: createdAt,
    finishedBefore: through,
    afterId: checkpoint.after_id,
  });
  const reporter = createBatchReporter(deps, context);
  if (checkpoint.after_id || history.results.length === FAILURE_SWEEP_BATCH_SIZE) {
    const recent = await readFailureCandidates(scope, {
      finishedAfter: new Date(
        Math.max(Date.parse(createdAt), Date.now() - RECENT_FAILURE_LOOKBACK_MS)
      ).toISOString(),
      finishedBefore: new Date().toISOString(),
      recent: true,
    });
    await reporter.reportBatch(recent.results);
  }
  const progress = await reporter.reportBatch(history.results);
  const incomplete =
    progress.scanned < history.results.length ||
    history.results.length === FAILURE_SWEEP_BATCH_SIZE;
  const afterId = progress.afterId ?? checkpoint.after_id;
  return {
    ...reporter.counts,
    checkpoint: incomplete ? { through, ...(afterId ? { after_id: afterId } : {}) } : {},
  };
};
