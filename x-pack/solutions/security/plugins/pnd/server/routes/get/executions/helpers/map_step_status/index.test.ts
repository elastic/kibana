/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ExecutionStatus } from '@kbn/workflows';

import { mapStepStatus } from '.';

describe('mapStepStatus', () => {
  it('maps WAITING_FOR_INPUT to waiting_for_input', () => {
    expect(mapStepStatus(ExecutionStatus.WAITING_FOR_INPUT)).toBe('waiting_for_input');
  });

  it('maps COMPLETED to completed', () => {
    expect(mapStepStatus(ExecutionStatus.COMPLETED)).toBe('completed');
  });

  it('maps FAILED to failed', () => {
    expect(mapStepStatus(ExecutionStatus.FAILED)).toBe('failed');
  });

  it('maps TIMED_OUT to failed', () => {
    expect(mapStepStatus(ExecutionStatus.TIMED_OUT)).toBe('failed');
  });

  it('maps CANCELLED to skipped', () => {
    expect(mapStepStatus(ExecutionStatus.CANCELLED)).toBe('skipped');
  });

  it('maps SKIPPED to skipped', () => {
    expect(mapStepStatus(ExecutionStatus.SKIPPED)).toBe('skipped');
  });

  it.each([
    ExecutionStatus.PENDING,
    ExecutionStatus.WAITING,
    ExecutionStatus.WAITING_FOR_CHILD,
    ExecutionStatus.RUNNING,
    ExecutionStatus.QUEUED,
  ])('maps the in-progress status %s to running', (status) => {
    expect(mapStepStatus(status)).toBe('running');
  });

  it('fails safe to running for an unrecognised status', () => {
    expect(mapStepStatus('something-else')).toBe('running');
  });

  it('fails safe to running for an undefined status', () => {
    expect(mapStepStatus(undefined)).toBe('running');
  });
});
