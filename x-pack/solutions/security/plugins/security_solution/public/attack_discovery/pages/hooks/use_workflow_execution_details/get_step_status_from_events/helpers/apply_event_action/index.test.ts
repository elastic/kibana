/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ExecutionStatus } from '@kbn/workflows';

import type { StatusesTuple } from '../step_status_utils';

import { applyEventAction, applyStepStart, applyStepTerminal } from '.';

const ALL_PENDING: StatusesTuple = [
  ExecutionStatus.PENDING,
  ExecutionStatus.PENDING,
  ExecutionStatus.PENDING,
];

describe('applyStepStart', () => {
  it('returns the first step as RUNNING when all steps are PENDING', () => {
    const result = applyStepStart(ALL_PENDING);

    expect(result).toEqual([
      ExecutionStatus.RUNNING,
      ExecutionStatus.PENDING,
      ExecutionStatus.PENDING,
    ]);
  });

  it('returns a copy without changes when a step is already RUNNING', () => {
    const statuses: StatusesTuple = [
      ExecutionStatus.RUNNING,
      ExecutionStatus.PENDING,
      ExecutionStatus.PENDING,
    ];

    const result = applyStepStart(statuses);

    expect(result).toEqual([
      ExecutionStatus.RUNNING,
      ExecutionStatus.PENDING,
      ExecutionStatus.PENDING,
    ]);
  });

  it('returns the second step as RUNNING when the first step is COMPLETED', () => {
    const statuses: StatusesTuple = [
      ExecutionStatus.COMPLETED,
      ExecutionStatus.PENDING,
      ExecutionStatus.PENDING,
    ];

    const result = applyStepStart(statuses);

    expect(result).toEqual([
      ExecutionStatus.COMPLETED,
      ExecutionStatus.RUNNING,
      ExecutionStatus.PENDING,
    ]);
  });

  it('returns a copy without changes when all steps are terminal', () => {
    const statuses: StatusesTuple = [
      ExecutionStatus.COMPLETED,
      ExecutionStatus.COMPLETED,
      ExecutionStatus.COMPLETED,
    ];

    const result = applyStepStart(statuses);

    expect(result).toEqual([
      ExecutionStatus.COMPLETED,
      ExecutionStatus.COMPLETED,
      ExecutionStatus.COMPLETED,
    ]);
  });
});

describe('applyStepTerminal', () => {
  it('marks the RUNNING step as COMPLETED', () => {
    const statuses: StatusesTuple = [
      ExecutionStatus.RUNNING,
      ExecutionStatus.PENDING,
      ExecutionStatus.PENDING,
    ];

    const result = applyStepTerminal(statuses, ExecutionStatus.COMPLETED);

    expect(result).toEqual([
      ExecutionStatus.COMPLETED,
      ExecutionStatus.PENDING,
      ExecutionStatus.PENDING,
    ]);
  });

  it('marks the RUNNING step as FAILED', () => {
    const statuses: StatusesTuple = [
      ExecutionStatus.RUNNING,
      ExecutionStatus.PENDING,
      ExecutionStatus.PENDING,
    ];

    const result = applyStepTerminal(statuses, ExecutionStatus.FAILED);

    expect(result).toEqual([
      ExecutionStatus.FAILED,
      ExecutionStatus.PENDING,
      ExecutionStatus.PENDING,
    ]);
  });

  it('falls back to the first PENDING step when no step is RUNNING', () => {
    const result = applyStepTerminal(ALL_PENDING, ExecutionStatus.COMPLETED);

    expect(result).toEqual([
      ExecutionStatus.COMPLETED,
      ExecutionStatus.PENDING,
      ExecutionStatus.PENDING,
    ]);
  });

  it('returns a copy without changes when all steps are terminal', () => {
    const statuses: StatusesTuple = [
      ExecutionStatus.COMPLETED,
      ExecutionStatus.FAILED,
      ExecutionStatus.COMPLETED,
    ];

    const result = applyStepTerminal(statuses, ExecutionStatus.COMPLETED);

    expect(result).toEqual([
      ExecutionStatus.COMPLETED,
      ExecutionStatus.FAILED,
      ExecutionStatus.COMPLETED,
    ]);
  });
});

describe('applyEventAction', () => {
  it('applies step-start by transitioning the first PENDING step to RUNNING', () => {
    const result = applyEventAction(ALL_PENDING, 'step-start');

    expect(result).toEqual([
      ExecutionStatus.RUNNING,
      ExecutionStatus.PENDING,
      ExecutionStatus.PENDING,
    ]);
  });

  it('applies step-complete by transitioning the RUNNING step to COMPLETED', () => {
    const statuses: StatusesTuple = [
      ExecutionStatus.RUNNING,
      ExecutionStatus.PENDING,
      ExecutionStatus.PENDING,
    ];

    const result = applyEventAction(statuses, 'step-complete');

    expect(result).toEqual([
      ExecutionStatus.COMPLETED,
      ExecutionStatus.PENDING,
      ExecutionStatus.PENDING,
    ]);
  });

  it('applies step-fail by transitioning the RUNNING step to FAILED', () => {
    const statuses: StatusesTuple = [
      ExecutionStatus.RUNNING,
      ExecutionStatus.PENDING,
      ExecutionStatus.PENDING,
    ];

    const result = applyEventAction(statuses, 'step-fail');

    expect(result).toEqual([
      ExecutionStatus.FAILED,
      ExecutionStatus.PENDING,
      ExecutionStatus.PENDING,
    ]);
  });

  it('returns a copy without changes for an unrecognized action', () => {
    const result = applyEventAction(ALL_PENDING, 'workflow-start');

    expect(result).toEqual([
      ExecutionStatus.PENDING,
      ExecutionStatus.PENDING,
      ExecutionStatus.PENDING,
    ]);
  });
});
