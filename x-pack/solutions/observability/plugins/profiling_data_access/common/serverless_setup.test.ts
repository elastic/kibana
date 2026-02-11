/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { areServerlessResourcesSetup } from './serverless_setup';
import { createDefaultSetupState, mergePartialSetupStates } from './setup';

describe('areServerlessResourcesSetup', () => {
  it('returns false when profiling is disabled', () => {
    const state = mergePartialSetupStates(createDefaultSetupState(), [
      { profiling: { enabled: false } },
    ]);

    expect(areServerlessResourcesSetup(state)).toBeFalsy();
  });

  it('returns true when profiling is enabled', () => {
    const state = mergePartialSetupStates(createDefaultSetupState(), [
      { profiling: { enabled: true } },
    ]);

    expect(areServerlessResourcesSetup(state)).toBeTruthy();
  });
});
