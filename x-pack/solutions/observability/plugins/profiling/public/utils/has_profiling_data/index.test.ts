/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ProfilingStatus } from '@kbn/profiling-utils';
import { hasProfilingData } from '.';

const makeStatus = (otelData: boolean, universalProfilingData: boolean): ProfilingStatus => ({
  isEnabled: true,
  otel: { isAvailable: true, hasData: otelData },
  universalProfiling: {
    isAvailable: true,
    hasSetup: true,
    hasData: universalProfilingData,
    hasLegacyData: false,
    canSetup: true,
  },
});

describe('hasProfilingData', () => {
  it.each([
    ['only OTel data', makeStatus(true, false), true],
    ['only Universal Profiling data', makeStatus(false, true), true],
    ['data in both schemas', makeStatus(true, true), true],
    ['no data', makeStatus(false, false), false],
    ['an unresolved status', undefined, false],
    ['profiling disabled in Elasticsearch', { isEnabled: false } as const, false],
  ])('returns the expected value for %s', (_name, status, expected) => {
    expect(hasProfilingData(status)).toBe(expected);
  });
});
