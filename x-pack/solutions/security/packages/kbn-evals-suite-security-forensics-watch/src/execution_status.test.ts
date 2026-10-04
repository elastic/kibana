/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ExecutionStatus } from '@kbn/workflows';
import { isHalted, isPauseStatus, isTerminalStatus } from './execution_status';

describe('execution status classification', () => {
  it('treats both pause spellings as paused', () => {
    // The regression this file exists for: `waiting` and `waiting_for_input`
    // are the same state to the gate. Treating only one as paused let a parked
    // execution pass a post-rejection "halted" check.
    expect(isPauseStatus(ExecutionStatus.WAITING)).toBe(true);
    expect(isPauseStatus(ExecutionStatus.WAITING_FOR_INPUT)).toBe(true);
    expect(isPauseStatus(ExecutionStatus.COMPLETED)).toBe(false);
    expect(isPauseStatus(undefined)).toBe(false);
  });

  it('does not accept a paused execution as halted', () => {
    expect(isHalted(ExecutionStatus.WAITING)).toBe(false);
    expect(isHalted(ExecutionStatus.WAITING_FOR_INPUT)).toBe(false);
    expect(isHalted(ExecutionStatus.RUNNING)).toBe(false);
    expect(isHalted(ExecutionStatus.PENDING)).toBe(false);
    expect(isHalted(undefined)).toBe(false);
  });

  it('accepts terminal platform statuses as halted', () => {
    expect(isHalted(ExecutionStatus.COMPLETED)).toBe(true);
    expect(isHalted(ExecutionStatus.FAILED)).toBe(true);
    expect(isHalted(ExecutionStatus.CANCELLED)).toBe(true);
  });

  it('classifies the platform terminal list, not a local copy', () => {
    // Every terminal status must also satisfy `isTerminalStatus`, and no pause
    // status may appear in the terminal list.
    for (const status of Object.values(ExecutionStatus) as string[]) {
      if (isTerminalStatus(status)) {
        expect(isPauseStatus(status)).toBe(false);
      }
    }
  });
});
