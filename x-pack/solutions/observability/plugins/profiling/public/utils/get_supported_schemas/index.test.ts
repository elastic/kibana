/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ProfilingSchemasStatus } from '@kbn/profiling-utils';
import { ProfilingSchema } from '@kbn/profiling-utils';
import { getSupportedSchemas } from '.';

const createStatus = ({
  isUniversalProfilingAvailable = true,
  hasUniversalProfilingData = true,
  hasOtelData = true,
}: {
  isUniversalProfilingAvailable?: boolean;
  hasUniversalProfilingData?: boolean;
  hasOtelData?: boolean;
}): ProfilingSchemasStatus => ({
  isEnabled: true,
  otel: { isAvailable: true, hasData: hasOtelData },
  universalProfiling: {
    isAvailable: isUniversalProfilingAvailable,
    hasSetup: true,
    hasData: hasUniversalProfilingData,
    hasLegacyData: false,
  },
});

describe('getSupportedSchemas', () => {
  it.each([
    ['both schemas have data', createStatus({}), [ProfilingSchema.ECS, ProfilingSchema.OTEL]],
    [
      'only OTel has data',
      createStatus({ hasUniversalProfilingData: false }),
      [ProfilingSchema.OTEL],
    ],
    [
      'only Universal Profiling has data',
      createStatus({ hasOtelData: false }),
      [ProfilingSchema.ECS],
    ],
    [
      'Universal Profiling is not available',
      createStatus({ isUniversalProfilingAvailable: false }),
      [ProfilingSchema.OTEL],
    ],
    ['profiling is disabled', { isEnabled: false } as const, []],
    ['the status is unknown', undefined, []],
  ])('supports the expected schemas when %s', (_description, status, expected) => {
    expect(getSupportedSchemas(status)).toEqual(expected);
  });
});
