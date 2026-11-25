/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';
import type { KibanaRequest } from '@kbn/core/server';
import { StepCategory } from '@kbn/workflows';
import { createServerStepDefinition } from '@kbn/workflows-extensions/server';
import {
  investigationFailureSweepOutputSchema,
  sweepInvestigationFailures,
  type InvestigationFailureSweepDeps,
} from '../lib/investigation_failure_sweep';
import {
  pollAlertOutcomes,
  type PollAlertOutcomesDeps,
  type PollAlertOutcomesResult,
} from '../alert_outcomes/poll';

/** Alert outcome checks share the sweep's run, so they get a slice of it after reconciliation. */
export const ALERT_OUTCOME_POLL_BUDGET_MS = 60_000;
/** Leaves room in the sweep workflow's 4m timeout to save the checkpoint. */
const SWEEP_STEP_BUDGET_MS = 3.5 * 60_000;

export type SweepStepDeps = InvestigationFailureSweepDeps & {
  getAlertOutcomePollDeps?: (
    request: KibanaRequest,
    spaceId: string
  ) => Promise<PollAlertOutcomesDeps>;
};

/** Adapts the authenticated workflow step context to the failure sweep. */
export const sweepInvestigationFailuresStepDefinition = (deps: SweepStepDeps) =>
  createServerStepDefinition({
    id: 'nightshift.sweepInvestigationFailures',
    label: 'Reconcile nightshift investigation failures',
    description:
      'Reports persisted failed and timed-out investigation executions, then checks whether tracked external alerts recovered.',
    category: StepCategory.Ai,
    inputSchema: z.object({}),
    outputSchema: investigationFailureSweepOutputSchema,
    handler: async (context) => {
      const startedAt = Date.now();
      const { workflow, execution, kibanaUrl } = context.contextManager.getContext();
      if (execution.isTestRun) return { output: { checked: 0, errors: 0, checkpoint: {} } };
      const request = context.contextManager.getFakeRequest();
      const output = await sweepInvestigationFailures(deps, {
        request,
        spaceId: workflow.spaceId,
        workflowId: workflow.id,
        kibanaUrl,
        logger: context.logger,
        abortSignal: context.abortSignal,
      });
      const alertOutcomes = await pollWithinBudget(deps, {
        request,
        spaceId: workflow.spaceId,
        deadline: Math.min(
          Date.now() + ALERT_OUTCOME_POLL_BUDGET_MS,
          startedAt + SWEEP_STEP_BUDGET_MS
        ),
        abortSignal: context.abortSignal,
        logger: context.logger,
      });
      return { output: alertOutcomes ? { ...output, alert_outcomes: alertOutcomes } : output };
    },
  });

const pollWithinBudget = async (
  deps: SweepStepDeps,
  {
    request,
    spaceId,
    deadline,
    abortSignal,
    logger,
  }: {
    request: KibanaRequest;
    spaceId: string;
    deadline: number;
    abortSignal: AbortSignal;
    logger: Pick<PollAlertOutcomesDeps['logger'], 'warn'>;
  }
): Promise<PollAlertOutcomesResult | undefined> => {
  if (!deps.getAlertOutcomePollDeps) return undefined;
  try {
    const pollDeps = await deps.getAlertOutcomePollDeps(request, spaceId);
    return await pollAlertOutcomes(pollDeps, { spaceId, deadline, abortSignal });
  } catch (error) {
    // Polling never fails failure reconciliation, whose checkpoint the sweep must save.
    logger.warn(
      `Could not check alert outcomes in space ${spaceId}: ${
        error instanceof Error ? error.message : String(error)
      }`
    );
    return { checked: 0, recovered: 0, stopped: 0, errors: 1, timed_out: false };
  }
};
