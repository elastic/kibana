/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ExecutionStatus } from '@kbn/workflows';

import { getExecutionStatus } from '.';

describe('getExecutionStatus', () => {
  it('returns FAILED for failed', () => {
    expect(getExecutionStatus('failed')).toBe(ExecutionStatus.FAILED);
  });

  it('returns CANCELLED for canceled', () => {
    expect(getExecutionStatus('canceled')).toBe(ExecutionStatus.CANCELLED);
  });

  it('returns CANCELLED for dismissed', () => {
    expect(getExecutionStatus('dismissed')).toBe(ExecutionStatus.CANCELLED);
  });

  it('returns COMPLETED for succeeded', () => {
    expect(getExecutionStatus('succeeded')).toBe(ExecutionStatus.COMPLETED);
  });

  it('returns RUNNING for started', () => {
    expect(getExecutionStatus('started')).toBe(ExecutionStatus.RUNNING);
  });

  it('returns PENDING for undefined', () => {
    expect(getExecutionStatus(undefined)).toBe(ExecutionStatus.PENDING);
  });
});
