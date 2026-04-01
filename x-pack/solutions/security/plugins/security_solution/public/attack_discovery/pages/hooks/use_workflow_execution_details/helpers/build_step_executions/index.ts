/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ExecutionStatus } from '@kbn/workflows/types/v1';
import type { WorkflowExecutionDto } from '@kbn/workflows/types/latest';
import { isTerminalStatus } from '@kbn/workflows/types/utils';

import type { StepExecutionWithLink } from '../../../../loading_callout/types';

export const buildStepExecutions = (
  execution: WorkflowExecutionDto,
  workflowExecutionLookup: Map<string, string>,
  pipelinePhase?: string
): StepExecutionWithLink[] => {
  const workflowIdFromLookup = workflowExecutionLookup.get(execution.id);

  const attachWorkflowLink = (stepExecution: StepExecutionWithLink): StepExecutionWithLink => ({
    ...stepExecution,
    pipelinePhase: pipelinePhase ?? stepExecution.pipelinePhase,
    workflowDescription:
      execution.workflowDefinition?.description ?? stepExecution.workflowDescription,
    workflowId: execution.workflowId ?? workflowIdFromLookup ?? stepExecution.workflowId,
    workflowName:
      execution.workflowName ?? execution.workflowDefinition?.name ?? stepExecution.workflowName,
    workflowRunId: execution.id ?? stepExecution.workflowRunId,
  });

  /**
   * Workflows can emit internal "wrapper" or "system" steps that are not meaningful to
   * Attack Discovery users. We filter these out so the pipeline UI reflects only the
   * logical, user-facing steps (retrieve → generate → validate).
   */
  const INTERNAL_STEP_TYPES_TO_HIDE = new Set<string>(['step_level_timeout', 'wait']);
  const shouldHideStepType = (stepType: string | undefined): boolean =>
    stepType != null && INTERNAL_STEP_TYPES_TO_HIDE.has(stepType);

  const filteredStepExecutions = execution.stepExecutions.filter(
    (stepExecution) => !shouldHideStepType(stepExecution.stepType)
  );

  const stepExecutionsWithLinks = filteredStepExecutions.map((stepExecution) =>
    attachWorkflowLink(stepExecution)
  );

  const definitionSteps = (execution.workflowDefinition?.steps ?? []).filter(
    (step) => !shouldHideStepType(step.type)
  );
  if (definitionSteps.length === 0) {
    if (stepExecutionsWithLinks.length > 0) {
      return stepExecutionsWithLinks;
    }

    // No definition steps AND no step executions (e.g., a workflow with `steps: []`).
    // Create a single synthetic placeholder so the workflow still appears in the UI.
    if (isTerminalStatus(execution.status)) {
      return [
        attachWorkflowLink({
          error: undefined,
          executionTimeMs: typeof execution.duration === 'number' ? execution.duration : undefined,
          finishedAt: execution.finishedAt ?? undefined,
          globalExecutionIndex: 0,
          id: `${execution.id ?? 'unknown'}-no-steps-placeholder`,
          input: undefined,
          output: undefined,
          scopeStack: [],
          startedAt: execution.startedAt ?? '',
          state: undefined,
          status: execution.status,
          stepExecutionIndex: 0,
          stepId: pipelinePhase ?? 'retrieve_alerts',
          stepType: undefined,
          topologicalIndex: 0,
        }),
      ];
    }

    return stepExecutionsWithLinks;
  }

  /**
   * Workflows execution details can be eventually consistent right after a workflow finishes.
   * In rare cases we may observe a terminal workflow execution with zero step executions yet.
   *
   * When that happens, we still want the Attack Discovery pipeline UI to reflect the workflow's
   * terminal status (e.g. show the green checkmark for Validation), rather than rendering an
   * "incomplete" numbered step indefinitely.
   */
  const shouldInferStepStatusFromExecution =
    filteredStepExecutions.length === 0 && isTerminalStatus(execution.status);

  // Deduplicate by `stepId` defensively (Workflows can emit multiple executions per logical step)
  // while still preserving the latest observed attempt.
  const stepExecutionByStepId = new Map<string, StepExecutionWithLink>();
  for (const stepExecution of stepExecutionsWithLinks) {
    const current = stepExecutionByStepId.get(stepExecution.stepId);

    if (!current || stepExecution.stepExecutionIndex >= current.stepExecutionIndex) {
      stepExecutionByStepId.set(stepExecution.stepId, stepExecution);
    }
  }

  const definitionStepIds = new Set(definitionSteps.map((step) => step.name));
  const extras = stepExecutionsWithLinks.filter(
    (stepExecution) => !definitionStepIds.has(stepExecution.stepId)
  );

  const stepExecutionsWithPendingPlaceholders = definitionSteps.map(
    (step, index): StepExecutionWithLink => {
      const existing = stepExecutionByStepId.get(step.name);
      if (existing) {
        return existing;
      }

      const inferredStatus = shouldInferStepStatusFromExecution
        ? execution.status
        : ExecutionStatus.PENDING;

      return attachWorkflowLink({
        error: undefined,
        executionTimeMs:
          shouldInferStepStatusFromExecution && typeof execution.duration === 'number'
            ? execution.duration
            : undefined,
        finishedAt: shouldInferStepStatusFromExecution
          ? execution.finishedAt ?? undefined
          : undefined,
        globalExecutionIndex: index,
        id: `${execution.id ?? 'unknown'}-${step.name}-pending`,
        input: undefined,
        output: undefined,
        scopeStack: [],
        startedAt: shouldInferStepStatusFromExecution ? execution.startedAt ?? '' : '',
        state: undefined,
        status: inferredStatus,
        stepExecutionIndex: 0,
        stepId: step.name,
        stepType: step.type,
        topologicalIndex: index,
      });
    }
  );

  return [...stepExecutionsWithPendingPlaceholders, ...extras];
};
