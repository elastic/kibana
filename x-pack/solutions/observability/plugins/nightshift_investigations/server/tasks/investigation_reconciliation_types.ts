/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/core/server';
import { ExecutionStatus } from '@kbn/workflows';
import type { InvestigationStatus } from '../../common';
import type {
  FindInvestigationsAcrossSpacesResult,
  InvestigationSweepRepository,
} from '../storage';

/** Statuses an investigation can linger in when no persist step ran. */
export const NON_TERMINAL_INVESTIGATION_STATUSES: readonly InvestigationStatus[] = [
  'pending',
  'running',
];

export const PAGE_SIZE = 100;

/** Execution ids per lookup. Every candidate in a batch shares a space. */
export const EXECUTION_LOOKUP_BATCH_SIZE = 100;

/**
 * Caps a single run. Candidates are read oldest-first, and a stale investigation only gets older,
 * so a backlog of legitimately running investigations cannot starve the ones that need fixing.
 */
export const MAX_CANDIDATES = 1_000;

/**
 * How long an investigation may stay running when no execution can report its run settling: a
 * reopened record still points at its first execution, and a record named after something other
 * than an execution, such as a Slack thread, points at none. The investigation workflow times out
 * after 60 minutes; the margin covers the reconciliation interval.
 */
export const UNTRACKED_RUN_TIMEOUT_MS = 70 * 60 * 1000;

export const UNTRACKED_RUN_TIMEOUT_ERROR =
  'Investigation did not finish within the workflow timeout';

/** Used when the execution recorded no error of its own. */
export const FALLBACK_ERRORS: Partial<Record<ExecutionStatus, string>> = {
  [ExecutionStatus.FAILED]: 'Workflow execution failed',
  [ExecutionStatus.TIMED_OUT]: 'Workflow execution timed out',
};

export interface ExecutionSummary {
  status: ExecutionStatus;
  workflowId?: string | null;
  originManagedWorkflowId?: string | null;
  error?: { message: string } | null;
  finishedAt?: string;
}

export interface ReconcileInvestigationStatusesDeps {
  investigationSweepRepository: InvestigationSweepRepository;
  getExecutionSummaries: (
    executionIds: string[],
    spaceId: string
  ) => Promise<ReadonlyMap<string, ExecutionSummary>>;
  logger: Logger;
  signal: AbortSignal;
}

export interface ReconciliationResult {
  scanned: number;
  reconciled: number;
}

export type ReconciliationCandidate = FindInvestigationsAcrossSpacesResult<
  'created_at' | 'started_at'
>['results'][number];

export interface ReconciliationOutcome {
  reconciledStatus: InvestigationStatus;
  completedAt: string;
  errorMessage?: string;
}
