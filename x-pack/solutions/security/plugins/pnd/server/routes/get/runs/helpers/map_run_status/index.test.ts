/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ExecutionStatus } from '@kbn/workflows';
import { isTerminalRunStatus, isUnsuccessfulTerminalRunStatus, mapRunStatus } from '.';

describe('mapRunStatus', () => {
  it('maps waiting_for_input to waiting_for_input', () => {
    expect(mapRunStatus(ExecutionStatus.WAITING_FOR_INPUT)).toEqual('waiting_for_input');
  });

  it('maps completed to succeeded', () => {
    expect(mapRunStatus(ExecutionStatus.COMPLETED)).toEqual('succeeded');
  });

  it('maps failed to failed', () => {
    expect(mapRunStatus(ExecutionStatus.FAILED)).toEqual('failed');
  });

  it('maps cancelled to cancelled', () => {
    expect(mapRunStatus(ExecutionStatus.CANCELLED)).toEqual('cancelled');
  });

  it('maps timed_out to timed_out', () => {
    expect(mapRunStatus(ExecutionStatus.TIMED_OUT)).toEqual('timed_out');
  });

  it('folds a whole-workflow skip to cancelled', () => {
    expect(mapRunStatus(ExecutionStatus.SKIPPED)).toEqual('cancelled');
  });

  it('folds pending to running', () => {
    expect(mapRunStatus(ExecutionStatus.PENDING)).toEqual('running');
  });

  it('folds waiting_for_child to running', () => {
    expect(mapRunStatus(ExecutionStatus.WAITING_FOR_CHILD)).toEqual('running');
  });

  it('folds queued to running', () => {
    expect(mapRunStatus(ExecutionStatus.QUEUED)).toEqual('running');
  });

  it('fails safe to running for an unknown status', () => {
    expect(mapRunStatus('something-new')).toEqual('running');
  });

  it('fails safe to running for an undefined status', () => {
    expect(mapRunStatus(undefined)).toEqual('running');
  });
});

describe('isTerminalRunStatus', () => {
  it('treats succeeded as terminal', () => {
    expect(isTerminalRunStatus('succeeded')).toBe(true);
  });

  it('treats running as non-terminal', () => {
    expect(isTerminalRunStatus('running')).toBe(false);
  });

  it('treats waiting_for_input as non-terminal', () => {
    expect(isTerminalRunStatus('waiting_for_input')).toBe(false);
  });
});

describe('isUnsuccessfulTerminalRunStatus', () => {
  it('treats failed as an unsuccessful terminal state', () => {
    expect(isUnsuccessfulTerminalRunStatus('failed')).toBe(true);
  });

  it('does not treat succeeded as unsuccessful', () => {
    expect(isUnsuccessfulTerminalRunStatus('succeeded')).toBe(false);
  });

  it('does not treat running as terminal', () => {
    expect(isUnsuccessfulTerminalRunStatus('running')).toBe(false);
  });
});
