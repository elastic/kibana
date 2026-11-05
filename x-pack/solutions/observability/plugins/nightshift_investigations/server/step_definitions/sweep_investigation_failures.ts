/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';
import { StepCategory } from '@kbn/workflows';
import { createServerStepDefinition } from '@kbn/workflows-extensions/server';
import {
  investigationFailureSweepOutputSchema,
  sweepInvestigationFailures,
  type InvestigationFailureSweepDeps,
} from '../lib/investigation_failure_sweep';

/** Adapts the authenticated workflow step context to the failure sweep. */
export const sweepInvestigationFailuresStepDefinition = (deps: InvestigationFailureSweepDeps) =>
  createServerStepDefinition({
    id: 'nightshift.sweepInvestigationFailures',
    label: 'Reconcile Nightshift investigation failures',
    description: 'Reports persisted failed and timed-out investigation executions.',
    category: StepCategory.Ai,
    inputSchema: z.object({}),
    outputSchema: investigationFailureSweepOutputSchema,
    handler: async (context) => {
      const { workflow, execution, kibanaUrl } = context.contextManager.getContext();
      if (execution.isTestRun) return { output: { checked: 0, errors: 0, checkpoint: {} } };
      const output = await sweepInvestigationFailures(deps, {
        request: context.contextManager.getFakeRequest(),
        spaceId: workflow.spaceId,
        workflowId: workflow.id,
        kibanaUrl,
        logger: context.logger,
        abortSignal: context.abortSignal,
      });
      return { output };
    },
  });
