/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ExecutionStatus } from '@kbn/workflows';

import type { StepExecutionWithLink } from '../../../types';
import { getCompositeStatus } from '.';

const createStep = (status: ExecutionStatus): StepExecutionWithLink =>
  ({
    status,
  } as unknown as StepExecutionWithLink);

describe('getCompositeStatus', () => {
  it('returns PENDING for empty array', () => {
    expect(getCompositeStatus([])).toBe(ExecutionStatus.PENDING);
  });

  it('returns RUNNING when any step is RUNNING', () => {
    const steps = [createStep(ExecutionStatus.COMPLETED), createStep(ExecutionStatus.RUNNING)];

    expect(getCompositeStatus(steps)).toBe(ExecutionStatus.RUNNING);
  });

  it('returns FAILED when any step is FAILED (and none RUNNING)', () => {
    const steps = [createStep(ExecutionStatus.COMPLETED), createStep(ExecutionStatus.FAILED)];

    expect(getCompositeStatus(steps)).toBe(ExecutionStatus.FAILED);
  });

  it('returns TIMED_OUT when any step is TIMED_OUT (and none RUNNING or FAILED)', () => {
    const steps = [createStep(ExecutionStatus.COMPLETED), createStep(ExecutionStatus.TIMED_OUT)];

    expect(getCompositeStatus(steps)).toBe(ExecutionStatus.TIMED_OUT);
  });

  it('returns COMPLETED when all steps are COMPLETED', () => {
    const steps = [createStep(ExecutionStatus.COMPLETED), createStep(ExecutionStatus.COMPLETED)];

    expect(getCompositeStatus(steps)).toBe(ExecutionStatus.COMPLETED);
  });

  it('returns PENDING when some steps are PENDING and none RUNNING/FAILED/TIMED_OUT', () => {
    const steps = [createStep(ExecutionStatus.COMPLETED), createStep(ExecutionStatus.PENDING)];

    expect(getCompositeStatus(steps)).toBe(ExecutionStatus.PENDING);
  });

  it('returns RUNNING as fallback for mixed statuses', () => {
    const steps = [createStep(ExecutionStatus.CANCELLED), createStep(ExecutionStatus.SKIPPED)];

    expect(getCompositeStatus(steps)).toBe(ExecutionStatus.RUNNING);
  });

  it('prioritizes RUNNING over FAILED', () => {
    const steps = [createStep(ExecutionStatus.RUNNING), createStep(ExecutionStatus.FAILED)];

    expect(getCompositeStatus(steps)).toBe(ExecutionStatus.RUNNING);
  });
});
