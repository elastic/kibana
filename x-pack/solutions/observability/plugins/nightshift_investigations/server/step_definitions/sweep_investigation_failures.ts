/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { lazySchema, z } from '@kbn/zod/v4';
import type { WorkflowExecutionListItemDto } from '@kbn/workflows';
import { ExecutionStatus, ExecutionType, StepCategory } from '@kbn/workflows';
import { createServerStepDefinition } from '@kbn/workflows-extensions/server';
import {
  NIGHTSHIFT_BOUND_INVESTIGATION_WORKFLOW_ID,
  NIGHTSHIFT_INVESTIGATION_WORKFLOW_ID,
  NIGHTSHIFT_INVESTIGATION_FAILURE_SWEEP_WORKFLOW_ID,
} from '@kbn/workflows/managed';
import type { GetTriggerEmitter } from '../types';
import type { GetWorkflowsManagement } from '../routes/types';
import type { InvestigationNotificationDeps } from '../lib/notifications/send_investigation_notifications';
import { isInvestigationWorkflowExecution } from '../lib/managed_workflows/is_investigation_workflow_execution';
import { reportUnsuccessfulInvestigation } from '../lib/report_unsuccessful_investigation';

export const FAILURE_SWEEP_BATCH_SIZE = 100;
const checkpointSchema = lazySchema(() =>
  z.object({
    through: z.iso.datetime().optional(),
    after_id: z.string().min(1).max(500).optional(),
  })
);
const outputSchema = lazySchema(() =>
  z.object({
    checked: z.number(),
    errors: z.number(),
    checkpoint: checkpointSchema,
  })
);

/** Processes a bounded page and carries its scan position in ordinary workflow output. */
export const sweepInvestigationFailuresStepDefinition = (
  deps: InvestigationNotificationDeps & {
    getTriggerEmitter: GetTriggerEmitter;
    getWorkflowsManagement: GetWorkflowsManagement;
  }
) =>
  createServerStepDefinition({
    id: 'nightshift.sweepInvestigationFailures',
    label: 'Reconcile Nightshift investigation failures',
    description: 'Reports persisted failed and timed-out investigation executions.',
    category: StepCategory.Ai,
    inputSchema: z.object({}),
    outputSchema,
    handler: async (context) => {
      const request = context.contextManager.getFakeRequest();
      const { workflow, execution, kibanaUrl } = context.contextManager.getContext();
      if (execution.isTestRun) return { output: { checked: 0, errors: 0, checkpoint: {} } };
      const { spaceId } = workflow;
      const management = deps.getWorkflowsManagement()?.management;
      if (!management) throw new Error('Workflows management is unavailable');
      const installed = await management.getWorkflow(workflow.id, spaceId, request);
      if (
        !installed ||
        installed.originManagedWorkflowId !== NIGHTSHIFT_INVESTIGATION_FAILURE_SWEEP_WORKFLOW_ID
      ) {
        throw new Error('Failure reconciliation must run from the managed sweep workflow');
      }
      const previous = await management.getWorkflowExecutions(
        {
          request,
          workflowId: workflow.id,
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
      const lastRun = last
        ? await management.getWorkflowExecution(last.id, spaceId, {
            request,
            includeOutput: true,
            omitStepExecutions: true,
          })
        : undefined;
      const output = outputSchema.safeParse(lastRun?.context?.output);
      const checkpoint = output.success ? output.data.checkpoint : undefined;
      // A pass has a fixed upper bound; subsequent passes revisit retained failures, including
      // failures persisted late by recovery and candidates whose previous reporting attempt failed.
      const through = checkpoint?.through ?? new Date().toISOString();
      const readCandidates = (options: {
        finishedAfter: string;
        finishedBefore: string;
        afterId?: string;
        recent?: boolean;
      }) =>
        management.searchExecutionsView(
          {
            request,
            includeManagedExecutions: true,
            statuses: [ExecutionStatus.FAILED, ExecutionStatus.TIMED_OUT],
            executionTypes: [ExecutionType.PRODUCTION],
            finishedAfter: options.finishedAfter,
            finishedBefore: options.finishedBefore,
            sortField: options.recent ? 'finishedAt' : 'id',
            sortOrder: options.recent ? 'desc' : 'asc',
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
                  ...(options.afterId ? [{ range: { id: { gt: options.afterId } } }] : []),
                ],
              },
            },
          },
          spaceId
        );
      const page = await readCandidates({
        finishedAfter: installed.createdAt,
        finishedBefore: through,
        afterId: checkpoint?.after_id,
      });
      let checked = 0;
      let errors = 0;
      let afterId = checkpoint?.after_id;
      const visited = new Set<string>();
      const report = async (candidate: WorkflowExecutionListItemDto): Promise<void> => {
        if (visited.has(candidate.id)) return;
        visited.add(candidate.id);
        try {
          if (isInvestigationWorkflowExecution(candidate)) {
            await reportUnsuccessfulInvestigation(deps, {
              request,
              spaceId,
              executionId: candidate.id,
              kibanaUrl,
              logger: context.logger,
              abortSignal: context.abortSignal,
            });
          }
        } catch (error) {
          errors++;
          context.logger.warn(
            `Could not reconcile investigation execution ${candidate.id}: ${
              error instanceof Error ? error.message : String(error)
            }`
          );
        }
        checked++;
      };
      // Prioritize fresh failures while a large retained-history pass is in progress.
      if (checkpoint?.after_id || page.results.length === FAILURE_SWEEP_BATCH_SIZE) {
        const recent = await readCandidates({
          finishedAfter: new Date(
            Math.max(Date.parse(installed.createdAt), Date.now() - 5 * 60_000)
          ).toISOString(),
          finishedBefore: new Date().toISOString(),
          recent: true,
        });
        for (const candidate of recent.results) {
          if (context.abortSignal.aborted) break;
          await report(candidate);
        }
      }
      let scanned = 0;
      for (const candidate of page.results) {
        if (context.abortSignal.aborted) break;
        await report(candidate);
        scanned++;
        afterId = candidate.id;
      }
      return {
        output: {
          checked,
          errors,
          // Only a complete, short page ends a pass. An aborted batch resumes after its last candidate.
          ...(scanned < page.results.length || page.results.length === FAILURE_SWEEP_BATCH_SIZE
            ? { checkpoint: { through, ...(afterId ? { after_id: afterId } : {}) } }
            : { checkpoint: {} }),
        },
      };
    },
  });
