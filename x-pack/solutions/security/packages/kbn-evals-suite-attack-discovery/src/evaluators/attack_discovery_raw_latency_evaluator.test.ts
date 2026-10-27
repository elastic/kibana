/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0. Use of this software is subject to the Elastic License 2.0.
 */

import { createAttackDiscoveryRawLatencyEvaluator } from './attack_discovery_raw_latency_evaluator';
import type { AttackDiscoveryTaskOutput } from '../types';

const evaluator = createAttackDiscoveryRawLatencyEvaluator();

const evaluate = async (output: AttackDiscoveryTaskOutput) =>
  evaluator.evaluate({
    input: undefined,
    output,
    expected: undefined,
    metadata: undefined,
  });

describe('createAttackDiscoveryRawLatencyEvaluator', () => {
  it('scores raw generateApi latency in seconds', async () => {
    const result = await evaluate({
      insights: [],
      raw: { latency_ms: 480_123 },
    });

    expect(result.score).toBeCloseTo(480.123);
    expect(result.label).toBe('seconds');
  });

  it('scores failed runs too — latency until failure still bounds the model', async () => {
    const result = await evaluate({
      insights: null,
      errors: ['poll timed out after 1500s'],
      raw: { latency_ms: 1_500_000 },
    });

    expect(result.score).toBeCloseTo(1500);
  });

  it('returns N/A when the mode records no raw latency', async () => {
    const result = await evaluate({ insights: [], traceId: 'trace-id' });

    expect(result.score).toBeNull();
    expect(result.label).toBe('N/A');
  });
});
