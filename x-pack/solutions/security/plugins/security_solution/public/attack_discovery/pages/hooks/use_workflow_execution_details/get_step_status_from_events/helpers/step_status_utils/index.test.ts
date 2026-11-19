/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ExecutionStatus } from '@kbn/workflows';

import type { StatusesTuple } from '.';
import { getFirstIndex, hasRunningStep, toStepStatus, updateAtIndex } from '.';

describe('toStepStatus', () => {
  it('maps a tuple to the named StepStatus object', () => {
    const statuses: StatusesTuple = [
      ExecutionStatus.COMPLETED,
      ExecutionStatus.RUNNING,
      ExecutionStatus.PENDING,
    ];

    const result = toStepStatus(statuses);

    expect(result).toEqual({
      alertRetrieval: ExecutionStatus.COMPLETED,
      generation: ExecutionStatus.RUNNING,
      validation: ExecutionStatus.PENDING,
    });
  });

  it('maps all-PENDING tuple', () => {
    const statuses: StatusesTuple = [
      ExecutionStatus.PENDING,
      ExecutionStatus.PENDING,
      ExecutionStatus.PENDING,
    ];

    const result = toStepStatus(statuses);

    expect(result).toEqual({
      alertRetrieval: ExecutionStatus.PENDING,
      generation: ExecutionStatus.PENDING,
      validation: ExecutionStatus.PENDING,
    });
  });
});

describe('hasRunningStep', () => {
  it('returns true when RUNNING is present', () => {
    const result = hasRunningStep([
      ExecutionStatus.COMPLETED,
      ExecutionStatus.RUNNING,
      ExecutionStatus.PENDING,
    ]);

    expect(result).toBe(true);
  });

  it('returns false when no step is RUNNING', () => {
    const result = hasRunningStep([
      ExecutionStatus.COMPLETED,
      ExecutionStatus.PENDING,
      ExecutionStatus.PENDING,
    ]);

    expect(result).toBe(false);
  });

  it('returns false for an empty array', () => {
    const result = hasRunningStep([]);

    expect(result).toBe(false);
  });
});

describe('getFirstIndex', () => {
  it('returns 0 when the first element matches', () => {
    const result = getFirstIndex(
      [ExecutionStatus.PENDING, ExecutionStatus.COMPLETED, ExecutionStatus.COMPLETED],
      ExecutionStatus.PENDING
    );

    expect(result).toBe(0);
  });

  it('returns 1 when the second element is the first match', () => {
    const result = getFirstIndex(
      [ExecutionStatus.COMPLETED, ExecutionStatus.PENDING, ExecutionStatus.PENDING],
      ExecutionStatus.PENDING
    );

    expect(result).toBe(1);
  });

  it('returns 2 when the third element is the first match', () => {
    const result = getFirstIndex(
      [ExecutionStatus.COMPLETED, ExecutionStatus.COMPLETED, ExecutionStatus.PENDING],
      ExecutionStatus.PENDING
    );

    expect(result).toBe(2);
  });

  it('returns null when no element matches', () => {
    const result = getFirstIndex(
      [ExecutionStatus.COMPLETED, ExecutionStatus.COMPLETED, ExecutionStatus.COMPLETED],
      ExecutionStatus.PENDING
    );

    expect(result).toBeNull();
  });
});

describe('updateAtIndex', () => {
  it('updates the element at index 0', () => {
    const statuses: StatusesTuple = [
      ExecutionStatus.PENDING,
      ExecutionStatus.PENDING,
      ExecutionStatus.PENDING,
    ];

    const result = updateAtIndex(statuses, 0, ExecutionStatus.RUNNING);

    expect(result).toEqual([
      ExecutionStatus.RUNNING,
      ExecutionStatus.PENDING,
      ExecutionStatus.PENDING,
    ]);
  });

  it('updates the element at index 1', () => {
    const statuses: StatusesTuple = [
      ExecutionStatus.COMPLETED,
      ExecutionStatus.PENDING,
      ExecutionStatus.PENDING,
    ];

    const result = updateAtIndex(statuses, 1, ExecutionStatus.RUNNING);

    expect(result).toEqual([
      ExecutionStatus.COMPLETED,
      ExecutionStatus.RUNNING,
      ExecutionStatus.PENDING,
    ]);
  });

  it('updates the element at index 2', () => {
    const statuses: StatusesTuple = [
      ExecutionStatus.COMPLETED,
      ExecutionStatus.COMPLETED,
      ExecutionStatus.PENDING,
    ];

    const result = updateAtIndex(statuses, 2, ExecutionStatus.RUNNING);

    expect(result).toEqual([
      ExecutionStatus.COMPLETED,
      ExecutionStatus.COMPLETED,
      ExecutionStatus.RUNNING,
    ]);
  });

  it('does not mutate the original tuple', () => {
    const statuses: StatusesTuple = [
      ExecutionStatus.PENDING,
      ExecutionStatus.PENDING,
      ExecutionStatus.PENDING,
    ];

    updateAtIndex(statuses, 0, ExecutionStatus.RUNNING);

    expect(statuses).toEqual([
      ExecutionStatus.PENDING,
      ExecutionStatus.PENDING,
      ExecutionStatus.PENDING,
    ]);
  });
});
