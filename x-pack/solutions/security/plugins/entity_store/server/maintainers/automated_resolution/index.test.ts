/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createAutomatedResolutionMaintainerConfig } from '.';
import type { EntityStoreCoreSetup } from '../../types';

const mockCoreSetup = {
  getStartServices: jest.fn().mockResolvedValue([
    {
      savedObjects: {
        getScopedClient: jest.fn().mockReturnValue({}),
      },
    },
  ]),
} as unknown as EntityStoreCoreSetup;

describe('createAutomatedResolutionMaintainerConfig', () => {
  it('requires enterprise license', () => {
    const config = createAutomatedResolutionMaintainerConfig(mockCoreSetup);
    expect(config.minLicense).toBe('enterprise');
  });

  it('has correct maintainer id', () => {
    const config = createAutomatedResolutionMaintainerConfig(mockCoreSetup);
    expect(config.id).toBe('automated-resolution');
  });

  it('initialises state with per-rule watermarks for all Stage 0 rules', () => {
    const config = createAutomatedResolutionMaintainerConfig(mockCoreSetup);
    const state = config.initialState as any;
    expect(state.rules).toBeDefined();
    expect(state.rules.S1).toEqual({ lastProcessedTimestamp: null, lastRun: null });
    // S2-CF4 declared but not yet active
    expect(state.rules.S2).toEqual({ lastProcessedTimestamp: null, lastRun: null });
    expect(state.rules.CF1).toEqual({ lastProcessedTimestamp: null, lastRun: null });
  });
});
