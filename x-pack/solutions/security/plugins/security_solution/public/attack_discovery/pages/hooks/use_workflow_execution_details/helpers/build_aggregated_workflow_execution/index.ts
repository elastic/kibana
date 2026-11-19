/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { WorkflowExecutionsTracking } from '@kbn/elastic-assistant-common';
import { ExecutionStatus } from '@kbn/workflows/types/v1';
import type { WorkflowExecutionDto } from '@kbn/workflows/types/latest';

import type {
  AggregatedWorkflowExecution,
  StepExecutionWithLink,
} from '../../../../loading_callout/types';
import { addAttackDiscoveryPipelinePlaceholders } from '../add_attack_discovery_pipeline_placeholders';
import { buildStepExecutions } from '../build_step_executions';
import { buildWorkflowExecutionLookup } from '../build_workflow_execution_lookup';
import type { WorkflowExecutionTarget } from '../build_workflow_execution_targets';
import { getAggregatedStatus } from '../get_aggregated_status';

export const buildAggregatedWorkflowExecution = ({
  executions,
  failedTargets,
  targets,
  workflowExecutions,
}: {
  executions: WorkflowExecutionDto[];
  failedTargets?: WorkflowExecutionTarget[];
  targets?: WorkflowExecutionTarget[];
  workflowExecutions?: WorkflowExecutionsTracking | null;
}): AggregatedWorkflowExecution => {
  const workflowExecutionLookup = buildWorkflowExecutionLookup(workflowExecutions);
  const steps = executions.flatMap((execution, executionIndex) => {
    // Look up the pipeline phase for this execution from the targets
    const pipelinePhase = targets?.find(
      (target) => target.workflowRunId === execution.id
    )?.pipelinePhase;

    const stepExecutions = buildStepExecutions(execution, workflowExecutionLookup, pipelinePhase);

    // `topologicalIndex` is not stable across aggregated workflows (and can be skewed by internal
    // wrapper steps we filter out). Recompute a stable ordering key so the pipeline renders in
    // the order we fetch: alert retrieval → generation → validation (plus any fallback target).
    return stepExecutions.map((stepExecution, stepIndex) => ({
      ...stepExecution,
      topologicalIndex: executionIndex * 1000 + stepIndex,
    }));
  });

  // Create FAILED placeholder steps for alert retrieval targets whose fetch failed (e.g. 404).
  // This ensures the pipeline monitor's composite-status path is taken (>1 alert retrieval steps),
  // which correctly renders a danger/error indicator instead of a spinner.
  const failedPlaceholderSteps: StepExecutionWithLink[] = (failedTargets ?? []).map(
    (target, idx) => ({
      globalExecutionIndex: 0,
      id: `failed-${target.workflowRunId}`,
      pipelinePhase: target.pipelinePhase ?? 'retrieve_alerts',
      scopeStack: [],
      startedAt: '',
      status: ExecutionStatus.FAILED,
      stepExecutionIndex: 0,
      stepId: target.pipelinePhase ?? 'retrieve_alerts',
      topologicalIndex: executions.length * 1000 + idx,
      workflowId: target.workflowId,
      workflowName: target.workflowName ?? target.workflowId,
      workflowRunId: target.workflowRunId,
    })
  );

  const allSteps = [...steps, ...failedPlaceholderSteps];
  const sortedSteps = [...allSteps].sort((a, b) => a.topologicalIndex - b.topologicalIndex);
  const sortedStepsWithPlaceholders = addAttackDiscoveryPipelinePlaceholders(sortedSteps);

  return {
    status: getAggregatedStatus(executions),
    steps: sortedStepsWithPlaceholders,
    workflowExecutions,
  };
};
