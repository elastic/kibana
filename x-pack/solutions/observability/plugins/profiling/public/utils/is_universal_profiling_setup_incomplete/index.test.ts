/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { UniversalProfilingSchemaStatus } from '@kbn/profiling-utils';
import { isUniversalProfilingSetupIncomplete } from '.';

const incompleteSetup: UniversalProfilingSchemaStatus = {
  isAvailable: true,
  hasData: true,
  hasSetup: false,
  hasLegacyData: false,
};

describe('isUniversalProfilingSetupIncomplete', () => {
  it('returns true when there is data but the setup is incomplete', () => {
    expect(isUniversalProfilingSetupIncomplete(incompleteSetup)).toBe(true);
  });

  it.each([
    ['the setup is complete', { hasSetup: true }],
    ['there is no data', { hasData: false }],
    ['there is data from before 8.9.1', { hasLegacyData: true }],
    ['Universal Profiling is not available', { isAvailable: false }],
  ])('returns false when %s', (_name, status) => {
    expect(isUniversalProfilingSetupIncomplete({ ...incompleteSetup, ...status })).toBe(false);
  });
});
