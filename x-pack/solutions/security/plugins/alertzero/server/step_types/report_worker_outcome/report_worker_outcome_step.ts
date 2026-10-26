/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/core/server';
import type { ManagedWorkflowStateApi } from '@kbn/workflows/server/types';
import type { StepHandlerContext } from '@kbn/workflows-extensions/server';
import { createServerStepDefinition } from '@kbn/workflows-extensions/server';
import type { WorkflowsServerPluginSetup } from '@kbn/workflows-management-plugin/server';
import type { z } from '@kbn/zod/v4';
import {
  ReportWorkerOutcomeStepId,
  reportWorkerOutcomeStepCommonDefinition,
  reportWorkerOutcomeStepInputSchema,
} from '../../../common/step_types';
import type { AlertZeroTelemetryAnalytics } from '../../telemetry';
import { buildAlertZeroEnvelope, createAlertZeroTelemetryReporter } from '../../telemetry';
import { checkWorkflowManaged } from './check_workflow_managed';
import { describeErrorKind } from './describe_error';
import { isEventFromItsWorker } from './event_worker_ids';
import { findOutcomeContradictions } from './find_outcome_contradictions';
import { reportOutcome } from './report_outcome';
import { runWithinDeadline } from './run_within_deadline';
import type { ReportWorkerOutcomeSkipReason } from './skip_reasons';
import { WARN_SKIP_REASONS } from './skip_reasons';
import { verifyWorkerChain } from './verify_worker_chain';

/** Budget for each Elasticsearch read the verification makes. */
export const HOP_TIMEOUT_MS = 5000;

/** Budget for the opt-in read; no decision within it counts as opted out. */
export const OPT_IN_TIMEOUT_MS = 1000;

/**
 * Budget for the whole step. Report steps set no `timeout`, so this is what bounds the step: past
 * it, the step skips as `deadline_exceeded` instead of waiting on the managed check and the
 * execution reads, which take up to `HOP_TIMEOUT_MS` per phase.
 */
export const STEP_DEADLINE_MS = 20_000;

/** The setup-contract management API; its `getWorkflowExecution` honors `omitStepExecutions`. */
export type WorkflowExecutionReader = Pick<
  WorkflowsServerPluginSetup['management'],
  'getWorkflowExecution'
>;

export interface ReportWorkerOutcomeStepDeps {
  analytics: AlertZeroTelemetryAnalytics;
  /** Whether Kibana service accounts are on, which AlertZero needs to run its Workers. */
  areServiceAccountsEnabled: () => boolean;
  /** AlertZero's owner-bound managed workflows client, once start has resolved it. */
  getManagedWorkflowState: () => Promise<ManagedWorkflowStateApi | undefined>;
  getWorkflowsManagement: () => WorkflowExecutionReader | undefined;
  /** Whether telemetry is opted in; read before any Elasticsearch read, so an opted-out cluster pays none. */
  isTelemetryOptedIn: () => Promise<boolean>;
  /** The AlertZero server logger; skip reasons never reach the workflow event log. */
  logger: Logger;
}

type StepOutcome =
  | { reported: true }
  | { detail?: string; reason: ReportWorkerOutcomeSkipReason; reported: false };

const skipped = (reason: ReportWorkerOutcomeSkipReason, detail?: string): StepOutcome => ({
  detail,
  reason,
  reported: false,
});

/** Issue paths and codes only: the rendered values may carry text the step must not log. */
const describeIssues = (issues: readonly z.core.$ZodIssue[]): string =>
  issues.map(({ code, path }) => `${path.join('.') || '(root)'}: ${code}`).join('; ');

const verifyAndReport = async (
  deps: ReportWorkerOutcomeStepDeps,
  {
    abortSignal,
    contextManager,
    input,
  }: Pick<StepHandlerContext, 'abortSignal' | 'contextManager' | 'input'>
): Promise<StepOutcome> => {
  if (abortSignal.aborted) {
    return skipped('aborted');
  }

  const { execution, workflow } = contextManager.getContext();
  if (execution.isTestRun) {
    return skipped('test_run');
  }
  if (!(await deps.isTelemetryOptedIn())) {
    return skipped('opted_out');
  }
  if (abortSignal.aborted) {
    return skipped('aborted');
  }

  const unmanaged = await checkWorkflowManaged({
    abortSignal,
    areServiceAccountsEnabled: deps.areServiceAccountsEnabled,
    getManagedWorkflowState: deps.getManagedWorkflowState,
    hopTimeoutMs: HOP_TIMEOUT_MS,
    logger: deps.logger,
    spaceId: workflow.spaceId,
    workflowId: workflow.id,
  });
  if (unmanaged) {
    return skipped(unmanaged);
  }

  const management = deps.getWorkflowsManagement();
  if (!management) {
    return skipped('lineage_unavailable');
  }
  const request = contextManager.getFakeRequest();
  const chain = await verifyWorkerChain({
    abortSignal,
    executionId: execution.id,
    getExecution: (executionId) =>
      management.getWorkflowExecution(executionId, workflow.spaceId, {
        omitStepExecutions: true,
        request,
      }),
    hopTimeoutMs: HOP_TIMEOUT_MS,
    logger: deps.logger,
    spaceId: workflow.spaceId,
  });
  if (!chain.verified) {
    return skipped(chain.reason);
  }
  // Validated only for a verified Worker chain, so any other caller cannot raise warn-level skips.
  const parsed = reportWorkerOutcomeStepInputSchema.safeParse(input);
  if (!parsed.success) {
    return skipped('invalid_input', describeIssues(parsed.error.issues));
  }
  const contradictions = findOutcomeContradictions(parsed.data);
  if (contradictions.length > 0) {
    return skipped('invalid_input', contradictions.join('; '));
  }
  if (!isEventFromItsWorker(parsed.data.event, chain.root.originManagedWorkflowId)) {
    return skipped('wrong_worker', parsed.data.event);
  }
  if (abortSignal.aborted) {
    return skipped('aborted');
  }

  const reported = reportOutcome({
    envelope: buildAlertZeroEnvelope({ executionId: execution.id, root: chain.root }),
    input: parsed.data,
    report: createAlertZeroTelemetryReporter({ analytics: deps.analytics, logger: deps.logger }),
  });
  return reported ? { reported: true } : skipped('report_error');
};

const logSkip = (logger: Logger, reason: ReportWorkerOutcomeSkipReason, detail?: string) => {
  const message = `Skipped ${ReportWorkerOutcomeStepId} (${reason})${detail ? `: ${detail}` : ''}`;
  if (WARN_SKIP_REASONS.has(reason)) {
    logger.warn(message);
    return;
  }
  logger.debug(() => message);
};

/**
 * Reports an allowlisted Worker outcome event when the calling chain is a managed AlertZero Worker
 * run, and a Worker-specific event only from that Worker's own run. It never throws, outputs only
 * `{ reported }`, and gives up as `deadline_exceeded` after `STEP_DEADLINE_MS`. The caller check
 * is best-effort.
 */
export const getReportWorkerOutcomeStepDefinition = (deps: ReportWorkerOutcomeStepDeps) =>
  createServerStepDefinition({
    ...reportWorkerOutcomeStepCommonDefinition,
    handler: async ({ abortSignal, contextManager, input }) => {
      // At the deadline the checks still in flight see an aborted signal, so they never report.
      const outcome = await runWithinDeadline({
        abortSignal,
        deadlineMs: STEP_DEADLINE_MS,
        onDeadline: () => skipped('deadline_exceeded'),
        task: (signal) =>
          verifyAndReport(deps, { abortSignal: signal, contextManager, input }).catch(
            (error: unknown) => skipped('report_error', describeErrorKind(error))
          ),
      });
      if (!outcome.reported) {
        logSkip(deps.logger, outcome.reason, outcome.detail);
      }
      return { output: { reported: outcome.reported } };
    },
  });
