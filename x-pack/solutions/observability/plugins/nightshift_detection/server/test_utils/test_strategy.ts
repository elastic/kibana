/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  DetectionSignalReading,
  GenerateResult,
  GeneratorContext,
} from '../lib/strategies/types';
import type { DetectionStrategy } from '../lib/strategies/detection_strategy';

const ONE_MINUTE_MS = 60_000;

function createReading({
  status,
  bucketStart,
}: {
  status: DetectionSignalReading['status'];
  bucketStart: number;
}): DetectionSignalReading {
  return {
    status,
    fingerprint: `test-series-${status}`,
    entity: { type: 'service', name: 'test-service' },
    bucket_start: bucketStart,
    bucket_end: bucketStart + ONE_MINUTE_MS,
    value: status === 'breached' ? 1 : 0,
    unit: 'count',
    title: `Test series ${status}`,
    description: 'A reading from the test strategy.',
    importance: 50,
    evidence_esql: 'FROM test | LIMIT 1',
    role: 'primary',
    compare_with_normal: false,
    details: {},
  };
}

/** The strategy id of {@link createTestStrategy}. */
export const TEST_STRATEGY_ID = 'test_strategy';

/**
 * A strategy for tests: it runs every minute with no settle time and reports one breached and one
 * recovered reading for the first minute of every window.
 */
export function createTestStrategy(): DetectionStrategy {
  return {
    descriptor: {
      id: TEST_STRATEGY_ID,
      name: 'Test strategy',
      description: 'Reports a fixed pair of readings per window.',
      version: 1,
      cadence_minutes: 1,
      settle_minutes: 0,
      daily_new_event_cap: 10,
    },
    generator: {
      generate: async ({ window }: GeneratorContext): Promise<GenerateResult> => ({
        readings: [
          createReading({ status: 'breached', bucketStart: window.from }),
          createReading({ status: 'recovered', bucketStart: window.from }),
        ],
        notes: [],
        truncated: false,
      }),
    },
  };
}
