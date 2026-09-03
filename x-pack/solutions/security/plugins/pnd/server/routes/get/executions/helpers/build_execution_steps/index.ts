/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  PHASE_CATALOG,
  type PhaseCatalogEntry,
  type PndPhaseStepProjection,
  type PndPhaseStepStatus,
} from '@kbn/pnd-common';
import type { WorkflowStepExecutionDto } from '@kbn/workflows';

import { buildRunDeepLink } from '../../../runs/helpers/build_run_deep_link';
import { mapStepStatus } from '../map_step_status';

/**
 * Status for a catalog step PND does not execute because something upstream already did the work
 * (`liveness: 'upstream'`).
 *
 * The four-phase skeleton is always complete: every catalog row is returned so the flyout can render
 * it, and these rows say *Attack Discovery and existing Elastic Security did this before PND was
 * invoked*. That is a **static property of the catalog**, not of any execution, so no lookup happens
 * and no execution fields are attached — there is no PND step execution to point at.
 *
 * It is never `completed` (which would claim a PND step ran), never `not_started` (which would
 * suggest one is about to), and never `skipped`, which means only a genuine engine skip or cancel.
 */
export const UPSTREAM_STEP_STATUS: PndPhaseStepStatus = 'upstream';

/** Status for a `live` catalog step that has no execution record yet (its watch has not reached it). */
export const NOT_STARTED_STEP_STATUS: PndPhaseStepStatus = 'not_started';

export interface BuildExecutionStepsParams {
  /**
   * Latest step execution per `stepId`, aggregated across the Watch Floor and Post-Incident Watch
   * executions (from {@link selectStepExecutions}). A live catalog step is correlated by its
   * `orchestratorStepId`, which equals the `stepId` the corresponding YAML uses.
   */
  stepExecutionsByStepId: Map<string, WorkflowStepExecutionDto>;
}

/**
 * Project one catalog row onto the step execution that realizes it, at the mapped engine status.
 *
 * The deep link carries the row's **own** step execution id, so each row lands on its exact step in
 * the Workflows execution-details view rather than sharing one link per run (plan F1).
 */
const projectStepExecution = ({
  entry,
  status,
  stepExecution,
}: {
  entry: PhaseCatalogEntry;
  status: PndPhaseStepStatus;
  stepExecution: WorkflowStepExecutionDto;
}): PndPhaseStepProjection => {
  const { finishedAt, id, startedAt, workflowId, workflowRunId } = stepExecution;

  return {
    deepLinkPath: buildRunDeepLink({
      executionId: workflowRunId,
      stepExecutionId: id,
      workflowId,
    }),
    ...(finishedAt ? { finishedAt } : {}),
    phaseStepId: entry.id,
    ...(startedAt ? { startedAt } : {}),
    status,
    stepExecutionId: id,
    workflowId,
    workflowRunId,
  };
};

/**
 * Project the full {@link PHASE_CATALOG} onto the executions that realize it, producing one
 * {@link PndPhaseStepProjection} per catalog row in catalog order. The skeleton is always complete
 * regardless of what ran:
 *
 * - an **upstream** row carries {@link UPSTREAM_STEP_STATUS} and nothing else: Attack Discovery and
 *   existing Elastic Security perform that work before PND is invoked, so there is no PND step
 *   execution to correlate on and no deep link that would lead anywhere true;
 * - a **live** row whose step has executed carries the mapped engine status plus the workflow id,
 *   run id, step execution id, timestamps and a step-level deep link (F1);
 * - any other live row carries {@link NOT_STARTED_STEP_STATUS} and no execution fields.
 *
 * An answered gate — human or auto-approver — is the completed `waitForInput` step itself. There is
 * no second status and no marker-step lookup.
 *
 * Three of the four gates appear twice — once as a step row, once as the phase-gate row — and both
 * look the same step up in the same map, so the pair is incapable of showing divergent statuses.
 * Phase 4's live rows (`draft_tuning` / `apply_tuning`) resolve from the Detection Watch
 * execution, so a completed loop surfaces every workflow's steps in one timeline.
 */
export const buildExecutionSteps = ({
  stepExecutionsByStepId,
}: BuildExecutionStepsParams): PndPhaseStepProjection[] =>
  PHASE_CATALOG.map((entry): PndPhaseStepProjection => {
    if (entry.liveness !== 'live' || entry.orchestratorStepId == null) {
      // Upstream: the work happened before PND was invoked, so no step execution can realize it.
      return { phaseStepId: entry.id, status: UPSTREAM_STEP_STATUS };
    }

    const stepExecution = stepExecutionsByStepId.get(entry.orchestratorStepId);
    if (stepExecution == null) {
      return { phaseStepId: entry.id, status: NOT_STARTED_STEP_STATUS };
    }

    return projectStepExecution({
      entry,
      status: mapStepStatus(stepExecution.status),
      stepExecution,
    });
  });
