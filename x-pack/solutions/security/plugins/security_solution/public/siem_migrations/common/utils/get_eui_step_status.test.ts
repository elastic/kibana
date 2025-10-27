/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getEuiStepStatus } from './get_eui_step_status';

describe('getEuiStepStatus', () => {
  it('returns "current" when the step is the current step', () => {
    expect(getEuiStepStatus(1, 1)).toBe('current');
  });

  it('returns "complete" when the step is less than the current step', () => {
    expect(getEuiStepStatus(1, 2)).toBe('complete');
  });

  it('returns "incomplete" when the step is greater than the current step', () => {
    expect(getEuiStepStatus(2, 1)).toBe('incomplete');
  });
});
