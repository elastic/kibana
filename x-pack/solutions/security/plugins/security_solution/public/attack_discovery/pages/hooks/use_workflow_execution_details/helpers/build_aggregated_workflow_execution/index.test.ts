/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { WorkflowExecutionsTracking } from '@kbn/elastic-assistant-common';
import { ExecutionStatus } from '@kbn/workflows/types/v1';
import type { WorkflowExecutionDto } from '@kbn/workflows/types/latest';

import { buildAggregatedWorkflowExecution } from '.';

const baseExecution: WorkflowExecutionDto = {
  context: undefined,
  duration: 1000,
  entryTransactionId: 'tx-1',
  error: null,
  finishedAt: '2024-01-01T00:01:00Z',
  id: 'run-1',
  isTestRun: false,
  spaceId: 'default',
  startedAt: '2024-01-01T00:00:00Z',
  status: ExecutionStatus.COMPLETED,
  stepExecutions: [
    {
      error: undefined,
      executionTimeMs: 100,
      finishedAt: '2024-01-01T00:00:01Z',
      globalExecutionIndex: 0,
      id: 'step-1',
      input: undefined,
      output: undefined,
      scopeStack: [],
      startedAt: '2024-01-01T00:00:00Z',
      state: undefined,
      status: ExecutionStatus.COMPLETED,
      stepExecutionIndex: 0,
      stepId: 'retrieve_alerts',
      stepType: 'attack-discovery.defaultAlertRetrieval',
      topologicalIndex: 0,
      workflowId: 'wf-1',
      workflowRunId: 'run-1',
    },
  ],
  traceId: 'trace-1',
  workflowDefinition: {
    description: 'Test',
    enabled: true,
    name: 'Test Workflow',
    steps: [],
    triggers: [],
    version: '1',
  },
  workflowId: 'wf-1',
  workflowName: 'Test Workflow',
  yaml: '',
};

describe('buildAggregatedWorkflowExecution', () => {
  it('returns PENDING status when there are no executions', () => {
    const result = buildAggregatedWorkflowExecution({ executions: [] });

    expect(result.status).toBe(ExecutionStatus.PENDING);
  });

  it('aggregates steps from multiple executions', () => {
    const alertExecution: WorkflowExecutionDto = {
      ...baseExecution,
      id: 'alert-run',
      stepExecutions: [
        {
          ...baseExecution.stepExecutions[0],
          stepId: 'retrieve_alerts',
          stepType: 'attack-discovery.defaultAlertRetrieval',
        },
      ],
    };

    const genExecution: WorkflowExecutionDto = {
      ...baseExecution,
      id: 'gen-run',
      stepExecutions: [
        {
          ...baseExecution.stepExecutions[0],
          stepId: 'generate_discoveries',
          stepType: 'attack-discovery.generate',
        },
      ],
    };

    const result = buildAggregatedWorkflowExecution({
      executions: [alertExecution, genExecution],
    });

    expect(result.steps.map((s) => s.stepId)).toContain('retrieve_alerts');
    expect(result.steps.map((s) => s.stepId)).toContain('generate_discoveries');
  });

  it('recomputes topological indices per execution', () => {
    const exec1: WorkflowExecutionDto = {
      ...baseExecution,
      id: 'exec-1',
      stepExecutions: [
        { ...baseExecution.stepExecutions[0], stepId: 'step_a', topologicalIndex: 99 },
      ],
    };

    const exec2: WorkflowExecutionDto = {
      ...baseExecution,
      id: 'exec-2',
      stepExecutions: [
        { ...baseExecution.stepExecutions[0], stepId: 'step_b', topologicalIndex: 1 },
      ],
    };

    const result = buildAggregatedWorkflowExecution({
      executions: [exec1, exec2],
    });

    const stepA = result.steps.find((s) => s.stepId === 'step_a');
    const stepB = result.steps.find((s) => s.stepId === 'step_b');

    expect(stepA?.topologicalIndex).toBe(0);
    expect(stepB?.topologicalIndex).toBe(1000);
  });

  it('attaches pipeline phase from targets', () => {
    const result = buildAggregatedWorkflowExecution({
      executions: [baseExecution],
      targets: [{ pipelinePhase: 'retrieve_alerts', workflowRunId: 'run-1' }],
    });

    expect(result.steps[0].pipelinePhase).toBe('retrieve_alerts');
  });

  it('passes workflowExecutions through to the result', () => {
    const workflowExecutions: WorkflowExecutionsTracking = {
      alertRetrieval: [],
      generation: null,
      validation: null,
    };

    const result = buildAggregatedWorkflowExecution({
      executions: [],
      workflowExecutions,
    });

    expect(result.workflowExecutions).toBe(workflowExecutions);
  });

  it('creates FAILED placeholder steps for failedTargets with retrieve_alerts pipelinePhase', () => {
    const result = buildAggregatedWorkflowExecution({
      executions: [baseExecution],
      failedTargets: [
        {
          pipelinePhase: 'retrieve_alerts',
          workflowId: 'workflow-custom-failed',
          workflowRunId: 'custom-placeholder-run',
        },
      ],
      targets: [{ pipelinePhase: 'retrieve_alerts', workflowRunId: 'run-1' }],
    });

    const failedStep = result.steps.find((s) => s.id === 'failed-custom-placeholder-run');

    expect(failedStep).toBeDefined();
    expect(failedStep?.status).toBe(ExecutionStatus.FAILED);
    expect(failedStep?.pipelinePhase).toBe('retrieve_alerts');
    expect(failedStep?.workflowId).toBe('workflow-custom-failed');
    expect(failedStep?.workflowRunId).toBe('custom-placeholder-run');
  });

  it('returns two alert retrieval steps when one succeeds and one fails', () => {
    const result = buildAggregatedWorkflowExecution({
      executions: [baseExecution],
      failedTargets: [
        {
          pipelinePhase: 'retrieve_alerts',
          workflowId: 'workflow-custom-failed',
          workflowRunId: 'custom-placeholder-run',
        },
      ],
      targets: [{ pipelinePhase: 'retrieve_alerts', workflowRunId: 'run-1' }],
    });

    const alertRetrievalSteps = result.steps.filter(
      (s) => s.pipelinePhase === 'retrieve_alerts' || s.stepId === 'retrieve_alerts'
    );

    expect(alertRetrievalSteps).toHaveLength(2);
  });

  it('sorts steps by topologicalIndex', () => {
    const exec1: WorkflowExecutionDto = {
      ...baseExecution,
      id: 'exec-1',
      stepExecutions: [
        {
          ...baseExecution.stepExecutions[0],
          stepId: 'retrieve_alerts',
          stepType: 'attack-discovery.defaultAlertRetrieval',
        },
      ],
    };

    const exec2: WorkflowExecutionDto = {
      ...baseExecution,
      id: 'exec-2',
      stepExecutions: [
        {
          ...baseExecution.stepExecutions[0],
          stepId: 'generate_discoveries',
          stepType: 'attack-discovery.generate',
        },
      ],
    };

    const result = buildAggregatedWorkflowExecution({
      executions: [exec1, exec2],
    });

    for (let i = 1; i < result.steps.length; i++) {
      expect(result.steps[i].topologicalIndex).toBeGreaterThanOrEqual(
        result.steps[i - 1].topologicalIndex
      );
    }
  });
});
