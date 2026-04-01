/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ExecutionStatus } from '@kbn/workflows';
import type { WorkflowExecutionDto, WorkflowStepExecutionDto } from '@kbn/workflows/types/latest';

import { ensureStepTiming, isTerminalStatus } from './helpers/ensure_step_timing';
import { getExecutionStatus } from './helpers/get_execution_status';
import { getStepExecutionStatus } from './helpers/get_step_execution_status';
import { getStepOutput } from './helpers/get_step_output';
import {
  getOrCreateStubExecutionState,
  stubExecutionStateByRunId,
} from './helpers/stub_execution_state';

export type AttackDiscoveryGenerationStatus =
  | 'started'
  | 'succeeded'
  | 'failed'
  | 'canceled'
  | 'dismissed';

export interface StubWorkflowExecutionData {
  alertsContextCount?: number | null;
  discoveriesCount?: number | null;
  eventActions?: string[] | null;
  generationStatus?: AttackDiscoveryGenerationStatus;
}

const WORKFLOW_DEFINITION: WorkflowExecutionDto['workflowDefinition'] = {
  enabled: true,
  name: 'Attack discovery generation (stubbed)',
  steps: [
    {
      name: 'wait',
      type: 'wait',
      with: {
        duration: '1s',
      },
    },
  ],
  triggers: [
    {
      type: 'manual',
    },
  ],
  version: '1',
};

const PIPELINE_STEPS: Array<
  Pick<WorkflowStepExecutionDto, 'stepId' | 'stepType' | 'topologicalIndex'>
> = [
  {
    stepId: 'retrieve_alerts',
    stepType: 'attack-discovery.defaultAlertRetrieval',
    topologicalIndex: 0,
  },
  {
    stepId: 'generate_discoveries',
    stepType: 'attack-discovery.generate',
    topologicalIndex: 1,
  },
  {
    stepId: 'validate_discoveries',
    stepType: 'attack-discovery.defaultValidation',
    topologicalIndex: 2,
  },
];

/**
 * Builds a stubbed WorkflowExecutionDto for legacy Attack Discovery generations.
 *
 * This is a temporary bridge until the Workflows API returns actual step executions.
 */
export const buildStubWorkflowExecution = (
  workflowRunId: string,
  stubData: StubWorkflowExecutionData
): WorkflowExecutionDto => {
  const nowMs = Date.now();
  const state = getOrCreateStubExecutionState(workflowRunId);
  const startedAt = new Date(state.startedAtMs).toISOString();

  const status = getExecutionStatus(stubData.generationStatus);
  const shouldHaveFinishedAt = isTerminalStatus(status);

  if (shouldHaveFinishedAt && state.finishedAtMs == null) {
    state.finishedAtMs = nowMs;
  }

  const finishedAt =
    shouldHaveFinishedAt && state.finishedAtMs != null
      ? new Date(state.finishedAtMs).toISOString()
      : '';

  const stepExecutions: WorkflowStepExecutionDto[] = PIPELINE_STEPS.map((step, index) => {
    const stepStatus = getStepExecutionStatus({
      eventActions: stubData.eventActions,
      fallbackStatus: status,
      stepId: step.stepId,
    });

    const timing = ensureStepTiming({
      nowMs,
      state,
      status: stepStatus,
      stepId: step.stepId,
    });

    const stepStartedAt =
      timing.startedAtMs != null
        ? new Date(timing.startedAtMs).toISOString()
        : stepStatus === ExecutionStatus.PENDING
        ? ''
        : new Date(state.startedAtMs).toISOString();

    return {
      executionTimeMs: isTerminalStatus(stepStatus) ? timing.executionTimeMs : undefined,
      finishedAt:
        isTerminalStatus(stepStatus) && timing.finishedAtMs != null
          ? new Date(timing.finishedAtMs).toISOString()
          : undefined,
      globalExecutionIndex: index,
      id: `${workflowRunId}-${step.stepId}`,
      input: undefined,
      error: undefined,
      output: getStepOutput({
        alertsContextCount: stubData.alertsContextCount,
        discoveriesCount: stubData.discoveriesCount,
        stepId: step.stepId,
      }),
      scopeStack: [],
      startedAt: stepStartedAt,
      state: undefined,
      status: stepStatus,
      stepExecutionIndex: 0,
      stepId: step.stepId,
      stepType: step.stepType,
      topologicalIndex: step.topologicalIndex,
      workflowId: 'attack-discovery-generation',
      workflowRunId,
    };
  });

  return {
    context: undefined,
    duration: null,
    entryTransactionId: undefined,
    error: null,
    finishedAt,
    id: workflowRunId,
    isTestRun: false,
    spaceId: 'default',
    startedAt,
    status,
    stepExecutions,
    traceId: undefined,
    workflowDefinition: WORKFLOW_DEFINITION,
    workflowId: 'attack-discovery-generation',
    workflowName: 'Attack discovery generation (stubbed)',
    yaml: '',
  };
};

/**
 * @internal
 * Exposed for unit tests to prevent state leaking across tests.
 */
export const __resetStubWorkflowExecutionState = (): void => {
  stubExecutionStateByRunId.clear();
};
