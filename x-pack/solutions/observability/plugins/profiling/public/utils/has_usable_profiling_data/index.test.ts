/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ProfilingStatus } from '@kbn/profiling-utils';
import { hasUsableProfilingData } from '.';

const makeStatus = (
  otelData: boolean,
  universalProfilingData: boolean,
  universalProfilingSetup = true
): ProfilingStatus => ({
  isEnabled: true,
  otel: { isAvailable: true, hasData: otelData },
  universalProfiling: {
    isAvailable: true,
    hasSetup: universalProfilingSetup,
    hasData: universalProfilingData,
    hasLegacyData: false,
    canSetup: true,
  },
});

describe('hasUsableProfilingData', () => {
  it.each([
    ['only OTel data', makeStatus(true, false), true],
    ['only OTel data and Universal Profiling is not set up', makeStatus(true, false, false), true],
    ['only Universal Profiling data', makeStatus(false, true), true],
    ['only Universal Profiling data that is not set up', makeStatus(false, true, false), false],
    ['data in both schemas', makeStatus(true, true), true],
    ['no data', makeStatus(false, false), false],
    ['an unresolved status', undefined, false],
    ['profiling disabled in Elasticsearch', { isEnabled: false } as const, false],
  ])('returns the expected value for %s', (_name, status, expected) => {
    expect(hasUsableProfilingData(status)).toBe(expected);
  });
});
