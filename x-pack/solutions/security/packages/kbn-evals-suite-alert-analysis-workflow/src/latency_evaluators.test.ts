/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { selectEvaluators } from '@kbn/evals';
import {
  classificationStepLatencySeconds,
  latencyEvaluators,
  secondsBetween,
  workflowLatencySeconds,
} from './latency_evaluators';
import { ExecutionStatus } from '@kbn/workflows';
import type { WorkflowTiming } from './workflow_task';

const run = (
  evaluator: typeof workflowLatencySeconds,
  timing?: WorkflowTiming,
  executionStatus: string = ExecutionStatus.COMPLETED
) =>
  evaluator.evaluate({
    output: { timing, executionStatus },
    expected: {},
    input: {},
    metadata: {},
  } as never);

describe('secondsBetween', () => {
  it('returns the gap in seconds', () => {
    expect(secondsBetween('2026-10-30T10:00:00.000Z', '2026-10-30T10:01:30.500Z')).toBe(90.5);
  });

  it.each([
    [undefined, '2026-10-30T10:00:00.000Z'],
    ['2026-10-30T10:00:00.000Z', undefined],
    ['', '2026-10-30T10:00:00.000Z'],
    ['not a date', '2026-10-30T10:00:00.000Z'],
    ['2026-10-30T10:00:10.000Z', '2026-10-30T10:00:00.000Z'],
  ])('returns null for unusable input (%s, %s)', (start, end) => {
    expect(secondsBetween(start, end)).toBeNull();
  });
});

describe('WorkflowLatencySeconds', () => {
  it('minimizes and scores the execution wall-clock in seconds', async () => {
    expect(workflowLatencySeconds.direction).toBe('minimize');

    const result = await run(workflowLatencySeconds, {
      startedAt: '2026-10-30T10:00:00.000Z',
      finishedAt: '2026-10-30T10:02:03.000Z',
    });

    expect(result.score).toBe(123);
  });

  it('scores null, not 0, when the engine reported no finish time', async () => {
    const result = await run(workflowLatencySeconds, { startedAt: '2026-10-30T10:00:00.000Z' });

    expect(result.score).toBeNull();
  });

  it('scores null when the task output carries no timing', async () => {
    expect((await run(workflowLatencySeconds)).score).toBeNull();
  });
});

describe('ClassificationStepLatencySeconds', () => {
  it('scores the classification span, not the whole execution', async () => {
    const result = await run(classificationStepLatencySeconds, {
      startedAt: '2026-10-30T10:00:00.000Z',
      finishedAt: '2026-10-30T10:02:00.000Z',
      classificationStartedAt: '2026-10-30T10:00:30.000Z',
      classificationFinishedAt: '2026-10-30T10:01:00.000Z',
    });

    expect(result.score).toBe(30);
  });

  it('scores null when no classification step ran', async () => {
    const result = await run(classificationStepLatencySeconds, {
      startedAt: '2026-10-30T10:00:00.000Z',
      finishedAt: '2026-10-30T10:02:00.000Z',
    });

    expect(result.score).toBeNull();
  });
});

describe('latency of runs that did not complete', () => {
  const timing: WorkflowTiming = {
    startedAt: '2026-10-30T10:00:00.000Z',
    finishedAt: '2026-10-30T10:00:02.000Z',
    classificationStartedAt: '2026-10-30T10:00:00.500Z',
    classificationFinishedAt: '2026-10-30T10:00:01.500Z',
  };

  it.each([workflowLatencySeconds, classificationStepLatencySeconds])(
    'scores null and names the status for a failed run ($name)',
    async (evaluator) => {
      const result = await run(evaluator, timing, ExecutionStatus.FAILED);

      expect(result.score).toBeNull();
      expect(result.label).toBe('unavailable');
      expect(result.explanation).toMatch(/: run not completed \(status=failed\)$/);
    }
  );

  it.each([
    ExecutionStatus.CANCELLED,
    ExecutionStatus.TIMED_OUT,
    ExecutionStatus.RUNNING,
    ExecutionStatus.SKIPPED,
  ])('scores null for status %s', async (status) => {
    expect((await run(workflowLatencySeconds, timing, status)).score).toBeNull();
  });

  it('scores null when the output carries no status', async () => {
    const result = await workflowLatencySeconds.evaluate({
      output: { timing },
      expected: {},
      input: {},
      metadata: {},
    } as never);

    expect(result.score).toBeNull();
    expect(result.explanation).toBe('workflow execution: run not completed (status=unknown)');
  });

  it('still scores a completed run with the same timing', async () => {
    expect((await run(workflowLatencySeconds, timing)).score).toBe(2);
    expect((await run(classificationStepLatencySeconds, timing)).score).toBe(1);
  });
});

describe('SELECTED_EVALUATORS filtering', () => {
  const original = process.env.SELECTED_EVALUATORS;

  afterEach(() => {
    if (original === undefined) {
      delete process.env.SELECTED_EVALUATORS;
    } else {
      process.env.SELECTED_EVALUATORS = original;
    }
  });

  it('keeps only the named latency evaluator', () => {
    process.env.SELECTED_EVALUATORS = 'WorkflowLatencySeconds';

    expect(selectEvaluators(latencyEvaluators).map((e) => e.name)).toEqual([
      'WorkflowLatencySeconds',
    ]);
  });

  it('keeps both latency evaluators when no filter is set', () => {
    delete process.env.SELECTED_EVALUATORS;

    expect(selectEvaluators(latencyEvaluators).map((e) => e.name)).toEqual([
      'WorkflowLatencySeconds',
      'ClassificationStepLatencySeconds',
    ]);
  });
});
