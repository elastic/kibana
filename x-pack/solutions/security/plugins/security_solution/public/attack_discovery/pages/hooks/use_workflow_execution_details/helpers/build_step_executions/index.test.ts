/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ExecutionStatus } from '@kbn/workflows/types/v1';
import type { WorkflowExecutionDto, WorkflowStepExecutionDto } from '@kbn/workflows/types/latest';

import { buildStepExecutions } from '.';

const createStepExecution = (
  overrides: Partial<WorkflowStepExecutionDto> & { stepId: string }
): WorkflowStepExecutionDto => ({
  error: undefined,
  executionTimeMs: 100,
  finishedAt: '2024-01-01T00:00:01Z',
  globalExecutionIndex: 0,
  id: `step-${overrides.stepId}`,
  input: undefined,
  output: undefined,
  scopeStack: [],
  startedAt: '2024-01-01T00:00:00Z',
  state: undefined,
  status: ExecutionStatus.COMPLETED,
  stepExecutionIndex: 0,
  stepType: 'some_type',
  topologicalIndex: 0,
  workflowId: 'wf-1',
  workflowRunId: 'run-1',
  ...overrides,
});

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
  status: ExecutionStatus.RUNNING,
  stepExecutions: [],
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

describe('buildStepExecutions', () => {
  const emptyLookup = new Map<string, string>();

  it('returns an empty array when a non-terminal execution has no step executions and no definition steps', () => {
    const result = buildStepExecutions(baseExecution, emptyLookup); // baseExecution.status = RUNNING

    expect(result).toEqual([]);
  });

  it('creates a synthetic placeholder step for a terminal execution with no definition steps and no step executions', () => {
    const execution: WorkflowExecutionDto = {
      ...baseExecution,
      duration: 42,
      finishedAt: '2024-01-01T00:00:05Z',
      startedAt: '2024-01-01T00:00:00Z',
      status: ExecutionStatus.COMPLETED,
      stepExecutions: [],
    };

    const result = buildStepExecutions(execution, emptyLookup, 'retrieve_alerts');

    expect(result).toHaveLength(1);
    expect(result[0].stepId).toBe('retrieve_alerts');
    expect(result[0].status).toBe(ExecutionStatus.COMPLETED);
    expect(result[0].executionTimeMs).toBe(42);
    expect(result[0].workflowId).toBe('wf-1');
    expect(result[0].workflowRunId).toBe('run-1');
    expect(result[0].pipelinePhase).toBe('retrieve_alerts');
  });

  it('falls back to "retrieve_alerts" stepId when no pipelinePhase is passed', () => {
    const execution: WorkflowExecutionDto = {
      ...baseExecution,
      status: ExecutionStatus.COMPLETED,
      stepExecutions: [],
    };

    const result = buildStepExecutions(execution, emptyLookup);

    expect(result).toHaveLength(1);
    expect(result[0].stepId).toBe('retrieve_alerts');
  });

  it('attaches workflow metadata to step executions', () => {
    const execution: WorkflowExecutionDto = {
      ...baseExecution,
      stepExecutions: [createStepExecution({ stepId: 'step_a', stepType: 'custom' })],
    };

    const result = buildStepExecutions(execution, emptyLookup);

    expect(result[0].workflowId).toBe('wf-1');
    expect(result[0].workflowRunId).toBe('run-1');
    expect(result[0].workflowName).toBe('Test Workflow');
    expect(result[0].workflowDescription).toBe('Test');
  });

  it('uses workflowId from lookup when execution.workflowId is undefined', () => {
    const lookup = new Map([['run-1', 'lookup-wf-id']]);

    const execution: WorkflowExecutionDto = {
      ...baseExecution,
      stepExecutions: [createStepExecution({ stepId: 'step_a' })],
      workflowId: undefined,
    };

    const result = buildStepExecutions(execution, lookup);

    expect(result[0].workflowId).toBe('lookup-wf-id');
  });

  it('sets pipelinePhase from the parameter', () => {
    const execution: WorkflowExecutionDto = {
      ...baseExecution,
      stepExecutions: [createStepExecution({ stepId: 'step_a' })],
    };

    const result = buildStepExecutions(execution, emptyLookup, 'retrieve_alerts');

    expect(result[0].pipelinePhase).toBe('retrieve_alerts');
  });

  it('filters out step_level_timeout steps', () => {
    const execution: WorkflowExecutionDto = {
      ...baseExecution,
      stepExecutions: [
        createStepExecution({ stepId: 'step_a', stepType: 'step_level_timeout' }),
        createStepExecution({ stepId: 'step_b', stepType: 'custom' }),
      ],
    };

    const result = buildStepExecutions(execution, emptyLookup);

    expect(result).toHaveLength(1);
    expect(result[0].stepId).toBe('step_b');
  });

  it('filters out wait steps', () => {
    const execution: WorkflowExecutionDto = {
      ...baseExecution,
      stepExecutions: [
        createStepExecution({ stepId: 'wait_step', stepType: 'wait' }),
        createStepExecution({ stepId: 'real_step', stepType: 'custom' }),
      ],
    };

    const result = buildStepExecutions(execution, emptyLookup);

    expect(result).toHaveLength(1);
    expect(result[0].stepId).toBe('real_step');
  });

  it('creates pending placeholders for definition steps missing from executions', () => {
    const execution: WorkflowExecutionDto = {
      ...baseExecution,
      stepExecutions: [createStepExecution({ stepId: 'step_a', stepType: 'custom_a' })],
      workflowDefinition: {
        ...baseExecution.workflowDefinition!,
        steps: [
          { name: 'step_a', type: 'custom_a', with: {} },
          { name: 'step_b', type: 'custom_b', with: {} },
        ],
      },
    };

    const result = buildStepExecutions(execution, emptyLookup);

    expect(result).toHaveLength(2);
    expect(result[0].stepId).toBe('step_a');
    expect(result[0].status).toBe(ExecutionStatus.COMPLETED);
    expect(result[1].stepId).toBe('step_b');
    expect(result[1].status).toBe(ExecutionStatus.PENDING);
  });

  it('infers step status from execution status when execution is terminal with empty steps', () => {
    const execution: WorkflowExecutionDto = {
      ...baseExecution,
      duration: 500,
      finishedAt: '2024-01-01T00:00:05Z',
      startedAt: '2024-01-01T00:00:00Z',
      status: ExecutionStatus.COMPLETED,
      stepExecutions: [],
      workflowDefinition: {
        ...baseExecution.workflowDefinition!,
        steps: [
          { name: 'step_a', type: 'custom_a', with: {} },
          { name: 'step_b', type: 'custom_b', with: {} },
        ],
      },
    };

    const result = buildStepExecutions(execution, emptyLookup);

    expect(result).toHaveLength(2);
    expect(result[0].status).toBe(ExecutionStatus.COMPLETED);
    expect(result[0].executionTimeMs).toBe(500);
    expect(result[1].status).toBe(ExecutionStatus.COMPLETED);
  });

  it('deduplicates by stepId keeping the highest stepExecutionIndex', () => {
    const execution: WorkflowExecutionDto = {
      ...baseExecution,
      stepExecutions: [
        createStepExecution({ stepExecutionIndex: 0, stepId: 'step_a', stepType: 'custom' }),
        createStepExecution({ stepExecutionIndex: 1, stepId: 'step_a', stepType: 'custom' }),
      ],
      workflowDefinition: {
        ...baseExecution.workflowDefinition!,
        steps: [{ name: 'step_a', type: 'custom', with: {} }],
      },
    };

    const result = buildStepExecutions(execution, emptyLookup);

    expect(result).toHaveLength(1);
    expect(result[0].stepExecutionIndex).toBe(1);
  });

  it('includes extra steps not in the definition', () => {
    const execution: WorkflowExecutionDto = {
      ...baseExecution,
      stepExecutions: [
        createStepExecution({ stepId: 'step_a', stepType: 'custom_a' }),
        createStepExecution({ stepId: 'extra_step', stepType: 'extra_type' }),
      ],
      workflowDefinition: {
        ...baseExecution.workflowDefinition!,
        steps: [{ name: 'step_a', type: 'custom_a', with: {} }],
      },
    };

    const result = buildStepExecutions(execution, emptyLookup);

    expect(result).toHaveLength(2);
    expect(result.map((s) => s.stepId)).toEqual(['step_a', 'extra_step']);
  });

  it('filters wait steps from workflowDefinition steps as well', () => {
    const execution: WorkflowExecutionDto = {
      ...baseExecution,
      stepExecutions: [],
      workflowDefinition: {
        ...baseExecution.workflowDefinition!,
        steps: [
          { name: 'wait', type: 'wait', with: {} },
          { name: 'real_step', type: 'custom', with: {} },
        ],
      },
    };

    const result = buildStepExecutions(execution, emptyLookup);

    expect(result).toHaveLength(1);
    expect(result[0].stepId).toBe('real_step');
  });
});
