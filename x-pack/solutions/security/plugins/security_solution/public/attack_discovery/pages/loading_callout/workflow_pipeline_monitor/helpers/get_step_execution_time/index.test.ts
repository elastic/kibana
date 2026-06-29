/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ExecutionStatus } from '@kbn/workflows';

import type { StepExecutionWithLink } from '../../../types';
import { getStepExecutionTime } from '.';

const createStep = (overrides: Partial<StepExecutionWithLink> = {}): StepExecutionWithLink => ({
  error: undefined,
  executionTimeMs: undefined,
  finishedAt: undefined,
  globalExecutionIndex: 0,
  id: 'step-1',
  input: undefined,
  output: undefined,
  scopeStack: [],
  startedAt: '2024-01-01T00:00:00.000Z',
  state: undefined,
  status: ExecutionStatus.COMPLETED,
  stepExecutionIndex: 0,
  stepId: 'test_step',
  stepType: 'test',
  topologicalIndex: 0,
  workflowId: 'wf-1',
  workflowRunId: 'run-1',
  ...overrides,
});

describe('getStepExecutionTime', () => {
  it('returns executionTimeMs when it is positive', () => {
    expect(getStepExecutionTime(createStep({ executionTimeMs: 1500 }))).toBe(1500);
  });

  it('returns undefined when executionTimeMs is zero', () => {
    expect(getStepExecutionTime(createStep({ executionTimeMs: 0 }))).toBeUndefined();
  });

  it('returns undefined when executionTimeMs is undefined and no timestamps', () => {
    expect(getStepExecutionTime(createStep({ finishedAt: undefined }))).toBeUndefined();
  });

  it('falls back to timestamp calculation when executionTimeMs is undefined', () => {
    const result = getStepExecutionTime(
      createStep({
        finishedAt: '2024-01-01T00:00:02.000Z',
        startedAt: '2024-01-01T00:00:00.000Z',
      })
    );

    expect(result).toBe(2000);
  });

  it('returns undefined when calculated duration is zero', () => {
    const result = getStepExecutionTime(
      createStep({
        finishedAt: '2024-01-01T00:00:00.000Z',
        startedAt: '2024-01-01T00:00:00.000Z',
      })
    );

    expect(result).toBeUndefined();
  });

  it('returns undefined when calculated duration is negative', () => {
    const result = getStepExecutionTime(
      createStep({
        finishedAt: '2024-01-01T00:00:00.000Z',
        startedAt: '2024-01-01T00:00:01.000Z',
      })
    );

    expect(result).toBeUndefined();
  });

  it('returns undefined when timestamps are invalid', () => {
    const result = getStepExecutionTime(
      createStep({
        finishedAt: 'not-a-date',
        startedAt: 'also-not-a-date',
      })
    );

    expect(result).toBeUndefined();
  });

  it('prefers executionTimeMs over timestamp calculation', () => {
    const result = getStepExecutionTime(
      createStep({
        executionTimeMs: 500,
        finishedAt: '2024-01-01T00:00:02.000Z',
        startedAt: '2024-01-01T00:00:00.000Z',
      })
    );

    expect(result).toBe(500);
  });
});
