/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { AGENT_BUILDER_TRIGGER, shouldRunGate } from '.';

describe('shouldRunGate', () => {
  it('skips the gate for the agent_builder trigger (recursion break)', () => {
    expect(shouldRunGate(AGENT_BUILDER_TRIGGER)).toBe(false);
  });

  it('runs the gate for the manual trigger', () => {
    expect(shouldRunGate('manual')).toBe(true);
  });

  it('runs the gate for the schedule trigger', () => {
    expect(shouldRunGate('schedule')).toBe(true);
  });

  it('runs the gate for the workflow run-step trigger', () => {
    expect(shouldRunGate('workflow')).toBe(true);
  });

  it('runs the gate when the trigger is undefined', () => {
    expect(shouldRunGate(undefined)).toBe(true);
  });
});
