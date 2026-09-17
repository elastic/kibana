/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ExecutionStatus } from '@kbn/workflows/types/v1';
import type { WorkflowExecutionDto } from '@kbn/workflows/types/latest';

import { getAggregatedStatus } from '.';

const createExecution = (status: ExecutionStatus): WorkflowExecutionDto =>
  ({
    status,
  } as unknown as WorkflowExecutionDto);

describe('getAggregatedStatus', () => {
  it('returns PENDING when there are no executions', () => {
    expect(getAggregatedStatus([])).toBe(ExecutionStatus.PENDING);
  });

  it('returns RUNNING when any execution is not in terminal status', () => {
    const executions = [
      createExecution(ExecutionStatus.COMPLETED),
      createExecution(ExecutionStatus.RUNNING),
    ];

    expect(getAggregatedStatus(executions)).toBe(ExecutionStatus.RUNNING);
  });

  it('returns FAILED when any execution failed (all terminal)', () => {
    const executions = [
      createExecution(ExecutionStatus.COMPLETED),
      createExecution(ExecutionStatus.FAILED),
    ];

    expect(getAggregatedStatus(executions)).toBe(ExecutionStatus.FAILED);
  });

  it('returns CANCELLED when any execution is cancelled (all terminal, none failed)', () => {
    const executions = [
      createExecution(ExecutionStatus.COMPLETED),
      createExecution(ExecutionStatus.CANCELLED),
    ];

    expect(getAggregatedStatus(executions)).toBe(ExecutionStatus.CANCELLED);
  });

  it('returns TIMED_OUT when any execution timed out (all terminal, none failed/cancelled)', () => {
    const executions = [
      createExecution(ExecutionStatus.COMPLETED),
      createExecution(ExecutionStatus.TIMED_OUT),
    ];

    expect(getAggregatedStatus(executions)).toBe(ExecutionStatus.TIMED_OUT);
  });

  it('returns SKIPPED when any execution is skipped (all terminal, none failed/cancelled/timed_out)', () => {
    const executions = [
      createExecution(ExecutionStatus.COMPLETED),
      createExecution(ExecutionStatus.SKIPPED),
    ];

    expect(getAggregatedStatus(executions)).toBe(ExecutionStatus.SKIPPED);
  });

  it('returns COMPLETED when all executions are completed', () => {
    const executions = [
      createExecution(ExecutionStatus.COMPLETED),
      createExecution(ExecutionStatus.COMPLETED),
      createExecution(ExecutionStatus.COMPLETED),
    ];

    expect(getAggregatedStatus(executions)).toBe(ExecutionStatus.COMPLETED);
  });

  it('returns COMPLETED for a single completed execution', () => {
    expect(getAggregatedStatus([createExecution(ExecutionStatus.COMPLETED)])).toBe(
      ExecutionStatus.COMPLETED
    );
  });

  it('prioritizes FAILED over CANCELLED', () => {
    const executions = [
      createExecution(ExecutionStatus.FAILED),
      createExecution(ExecutionStatus.CANCELLED),
    ];

    expect(getAggregatedStatus(executions)).toBe(ExecutionStatus.FAILED);
  });

  it('prioritizes CANCELLED over TIMED_OUT', () => {
    const executions = [
      createExecution(ExecutionStatus.CANCELLED),
      createExecution(ExecutionStatus.TIMED_OUT),
    ];

    expect(getAggregatedStatus(executions)).toBe(ExecutionStatus.CANCELLED);
  });
});
