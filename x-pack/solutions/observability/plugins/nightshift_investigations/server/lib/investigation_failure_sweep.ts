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
import { InvestigationNotFoundError } from '../client/errors';
import type {
  InvestigationNotificationDeps,
  InvestigationNotificationSource,
} from './notifications/send_investigation_notifications';
import { isInvestigationWorkflowExecution } from './managed_workflows/is_investigation_workflow_execution';
import { reportUnsuccessfulInvestigation } from './report_unsuccessful_investigation';

export const FAILURE_SWEEP_BATCH_SIZE = 100;
const MAX_BLOCKING_ATTEMPTS = 3;
// Overlap the five-minute schedule to tolerate scheduling and persistence delays.
const RECENT_FAILURE_LOOKBACK_MS = 10 * 60_000;
const retrySchema = lazySchema(() =>
  z.object({
    execution_id: z.string().min(1).max(500),
    attempts: z.number().int().min(1).max(MAX_BLOCKING_ATTEMPTS),
  })
);
const checkpointSchema = lazySchema(() =>
  z.object({
    completed_through: z.iso.datetime().optional(),
    through: z.iso.datetime().optional(),
    after_id: z.string().min(1).max(500).optional(),
    retry: retrySchema.optional(),
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
type ReportingRetry = z.infer<typeof retrySchema>;
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
  retry?: ReportingRetry;
}
interface BatchReporter {
  counts: Pick<SweepResult, 'checked' | 'errors'>;
  reportBatch: (
    candidates: WorkflowExecutionListItemDto[],
    previousRetry?: ReportingRetry
  ) => Promise<BatchProgress>;
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
  const visited = new Map<string, boolean>();
  const counts = { checked: 0, errors: 0 };
  const reportCandidate = async (candidate: WorkflowExecutionListItemDto): Promise<boolean> => {
    const previous = visited.get(candidate.id);
    if (previous !== undefined) return previous;
    let success = true;
    try {
      if (isInvestigationWorkflowExecution(candidate)) {
        await reportUnsuccessfulInvestigation(deps, { ...context, executionId: candidate.id });
      }
    } catch (error) {
      // Deleted or invalid investigations cannot be reported and must not hold the history cursor.
      success = error instanceof InvestigationNotFoundError;
      if (!success) counts.errors++;
      context.logger.warn(
        `Could not reconcile investigation execution ${candidate.id}: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    }
    visited.set(candidate.id, success);
    counts.checked++;
    return success;
  };
  const reportBatch = async (
    candidates: WorkflowExecutionListItemDto[],
    previousRetry?: ReportingRetry
  ): Promise<BatchProgress> => {
    let scanned = 0;
    let afterId: string | undefined;
    let retry: ReportingRetry | undefined;
    for (const candidate of candidates) {
      if (context.abortSignal.aborted) break;
      const success = await reportCandidate(candidate);
      if (!success && !retry) {
        const attempts =
          previousRetry?.execution_id === candidate.id ? previousRetry.attempts + 1 : 1;
        if (attempts < MAX_BLOCKING_ATTEMPTS) {
          retry = { execution_id: candidate.id, attempts };
        } else {
          context.logger.warn(
            `Skipping investigation execution ${candidate.id} after ${attempts} attempts while blocking the history cursor; failure reporting may be incomplete`
          );
        }
      }
      scanned++;
      // Retain the first retryable failure, but let an exhausted candidate release the cursor.
      if (!retry) afterId = candidate.id;
    }
    return { scanned, afterId, retry };
  };
  return { counts, reportBatch };
};

/** Reconciles bounded failure windows, retaining completed progress and unfinished page cursors. */
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
  const finishedAfter = checkpoint.completed_through
    ? new Date(
        Math.max(
          Date.parse(createdAt),
          Date.parse(checkpoint.completed_through) - RECENT_FAILURE_LOOKBACK_MS
        )
      ).toISOString()
    : createdAt;
  // Re-read an overlap for late-visible terminal writes without rescanning all retained history.
  const through = checkpoint.through ?? new Date().toISOString();
  const history = await readFailureCandidates(scope, {
    finishedAfter,
    finishedBefore: through,
    afterId: checkpoint.after_id,
  });
  const reporter = createBatchReporter(deps, context);
  if (
    checkpoint.through ||
    checkpoint.after_id ||
    history.results.length === FAILURE_SWEEP_BATCH_SIZE
  ) {
    const recent = await readFailureCandidates(scope, {
      finishedAfter: new Date(
        Math.max(Date.parse(createdAt), Date.now() - RECENT_FAILURE_LOOKBACK_MS)
      ).toISOString(),
      finishedBefore: new Date().toISOString(),
      recent: true,
    });
    await reporter.reportBatch(recent.results);
  }
  const progress = await reporter.reportBatch(history.results, checkpoint.retry);
  const retry =
    progress.retry ??
    (progress.scanned === 0 && history.results.length > 0 ? checkpoint.retry : undefined);
  const incomplete =
    retry ||
    progress.scanned < history.results.length ||
    history.results.length === FAILURE_SWEEP_BATCH_SIZE;
  const afterId = progress.afterId ?? checkpoint.after_id;
  return {
    ...reporter.counts,
    checkpoint: incomplete
      ? {
          ...(checkpoint.completed_through
            ? { completed_through: checkpoint.completed_through }
            : {}),
          through,
          ...(afterId ? { after_id: afterId } : {}),
          ...(retry ? { retry } : {}),
        }
      : { completed_through: through },
  };
};
