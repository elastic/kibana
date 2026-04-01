/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ExecutionStatus } from '@kbn/workflows';

import { __resetStubWorkflowExecutionState, buildStubWorkflowExecution } from '.';

describe('buildStubWorkflowExecution', () => {
  beforeAll(() => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2024-01-01T00:00:00.000Z'));
  });

  beforeEach(() => {
    __resetStubWorkflowExecutionState();
    jest.setSystemTime(new Date('2024-01-01T00:00:00.000Z'));
  });

  afterAll(() => {
    jest.useRealTimers();
  });

  it('returns 3 step executions', () => {
    const result = buildStubWorkflowExecution('stub-run-1', {});

    expect(result.stepExecutions).toHaveLength(3);
  });

  it('returns running status when generationStatus is started', () => {
    const result = buildStubWorkflowExecution('stub-run-1', { generationStatus: 'started' });

    expect(result.status).toBe(ExecutionStatus.RUNNING);
  });

  it('returns only first step running when generationStatus is started but eventActions is empty', () => {
    const result = buildStubWorkflowExecution('stub-run-1', {
      eventActions: [],
      generationStatus: 'started',
    });

    const stepStatuses = result.stepExecutions.map(({ status, stepId }) => ({ status, stepId }));

    expect(stepStatuses).toEqual([
      { status: ExecutionStatus.RUNNING, stepId: 'retrieve_alerts' },
      { status: ExecutionStatus.PENDING, stepId: 'generate_discoveries' },
      { status: ExecutionStatus.PENDING, stepId: 'validate_discoveries' },
    ]);
  });

  it('returns only first step running when generationStatus is started but eventActions is undefined', () => {
    const result = buildStubWorkflowExecution('stub-run-1', {
      generationStatus: 'started',
    });

    const stepStatuses = result.stepExecutions.map(({ status, stepId }) => ({ status, stepId }));

    expect(stepStatuses).toEqual([
      { status: ExecutionStatus.RUNNING, stepId: 'retrieve_alerts' },
      { status: ExecutionStatus.PENDING, stepId: 'generate_discoveries' },
      { status: ExecutionStatus.PENDING, stepId: 'validate_discoveries' },
    ]);
  });

  it('uses eventActions to infer each step status when available', () => {
    const result = buildStubWorkflowExecution('stub-run-1', {
      eventActions: ['step-start', 'step-complete', 'step-start'],
      generationStatus: 'started',
    });

    const stepStatuses = result.stepExecutions.map(({ status, stepId }) => ({ status, stepId }));

    expect(stepStatuses).toEqual([
      { status: ExecutionStatus.COMPLETED, stepId: 'retrieve_alerts' },
      { status: ExecutionStatus.RUNNING, stepId: 'generate_discoveries' },
      { status: ExecutionStatus.PENDING, stepId: 'validate_discoveries' },
    ]);
  });

  it('keeps running step startedAt stable across polling calls', () => {
    const first = buildStubWorkflowExecution('stub-run-1', {
      eventActions: ['step-start', 'step-complete', 'step-start'],
      generationStatus: 'started',
    });

    jest.advanceTimersByTime(1500);

    const second = buildStubWorkflowExecution('stub-run-1', {
      eventActions: ['step-start', 'step-complete', 'step-start'],
      generationStatus: 'started',
    });

    const firstRunning = first.stepExecutions.find((s) => s.stepId === 'generate_discoveries');
    const secondRunning = second.stepExecutions.find((s) => s.stepId === 'generate_discoveries');

    expect(secondRunning?.startedAt).toBe(firstRunning?.startedAt);
  });

  it('sets executionTimeMs for completed steps while overall execution is running', () => {
    const result = buildStubWorkflowExecution('stub-run-1', {
      eventActions: ['step-start', 'step-complete', 'step-start'],
      generationStatus: 'started',
    });

    const retrieveStep = result.stepExecutions.find((s) => s.stepId === 'retrieve_alerts');

    expect((retrieveStep?.executionTimeMs ?? 0) > 0).toBe(true);
  });

  it('returns completed status when generationStatus is succeeded', () => {
    const result = buildStubWorkflowExecution('stub-run-1', { generationStatus: 'succeeded' });

    expect(result.status).toBe(ExecutionStatus.COMPLETED);
  });

  it('returns cancelled status when generationStatus is canceled', () => {
    const result = buildStubWorkflowExecution('stub-run-1', { generationStatus: 'canceled' });

    expect(result.status).toBe(ExecutionStatus.CANCELLED);
  });

  it('includes alerts_context_count in retrieve_alerts output when provided', () => {
    const result = buildStubWorkflowExecution('stub-run-1', { alertsContextCount: 42 });
    const retrieveStep = result.stepExecutions.find((s) => s.stepId === 'retrieve_alerts');

    expect(retrieveStep?.output).toEqual({ alerts_context_count: 42 });
  });

  it('includes discoveries_count in generate_discoveries output when provided', () => {
    const result = buildStubWorkflowExecution('stub-run-1', { discoveriesCount: 7 });
    const generateStep = result.stepExecutions.find((s) => s.stepId === 'generate_discoveries');

    expect(generateStep?.output).toEqual({ discoveries_count: 7 });
  });

  it('includes discoveries_persisted in validate_discoveries output when provided', () => {
    const result = buildStubWorkflowExecution('stub-run-1', { discoveriesCount: 7 });
    const validationStep = result.stepExecutions.find((s) => s.stepId === 'validate_discoveries');

    expect(validationStep?.output).toEqual({ discoveries_persisted: 7 });
  });
});
