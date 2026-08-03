/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ExecutionStatus } from '@kbn/workflows';

import { mapStatusToEuiStatus } from '.';

describe('mapStatusToEuiStatus', () => {
  it('returns "incomplete" for PENDING', () => {
    expect(mapStatusToEuiStatus(ExecutionStatus.PENDING)).toBe('incomplete');
  });

  it('returns "incomplete" for WAITING', () => {
    expect(mapStatusToEuiStatus(ExecutionStatus.WAITING)).toBe('incomplete');
  });

  it('returns "incomplete" for WAITING_FOR_INPUT', () => {
    expect(mapStatusToEuiStatus(ExecutionStatus.WAITING_FOR_INPUT)).toBe('incomplete');
  });

  it('returns "loading" for RUNNING', () => {
    expect(mapStatusToEuiStatus(ExecutionStatus.RUNNING)).toBe('loading');
  });

  it('returns "complete" for COMPLETED', () => {
    expect(mapStatusToEuiStatus(ExecutionStatus.COMPLETED)).toBe('complete');
  });

  it('returns "danger" for FAILED', () => {
    expect(mapStatusToEuiStatus(ExecutionStatus.FAILED)).toBe('danger');
  });

  it('returns "danger" for TIMED_OUT', () => {
    expect(mapStatusToEuiStatus(ExecutionStatus.TIMED_OUT)).toBe('danger');
  });

  it('returns "disabled" for CANCELLED', () => {
    expect(mapStatusToEuiStatus(ExecutionStatus.CANCELLED)).toBe('disabled');
  });

  it('returns "disabled" for SKIPPED', () => {
    expect(mapStatusToEuiStatus(ExecutionStatus.SKIPPED)).toBe('disabled');
  });

  it('returns "incomplete" for an unknown status', () => {
    expect(mapStatusToEuiStatus('UNKNOWN_STATUS' as ExecutionStatus)).toBe('incomplete');
  });
});
