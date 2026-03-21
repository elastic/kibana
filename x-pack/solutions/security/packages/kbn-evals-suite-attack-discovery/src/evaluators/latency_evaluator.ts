/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Evaluator } from '@kbn/evals';
import type { AttackDiscoveryDatasetExample, AttackDiscoveryTaskOutput } from '../types';

export const LATENCY_EVALUATOR_NAME = 'Latency';

export interface LatencyMetadata {
  startTime: number;
  endTime: number;
  durationMs: number;
}

export const createLatencyEvaluator = (): Evaluator<
  AttackDiscoveryDatasetExample,
  AttackDiscoveryTaskOutput
> => {
  return {
    name: LATENCY_EVALUATOR_NAME,
    kind: 'CODE',
    evaluate: async ({ output }) => {
      const latency = output?.metadata?.latency as LatencyMetadata | undefined;

      if (!latency || typeof latency.durationMs !== 'number') {
        return {
          score: 0,
          label: 'missing_latency',
          metadata: { error: 'No latency data captured' },
        };
      }

      // Use raw duration in seconds as score for accurate comparison
      // Lower is better (but all scores are positive)
      // Divide by 1000 to normalize to 0-1 range roughly
      const durationSec = latency.durationMs / 1000;

      // Score: 1.0 represents 1 second, so 50s = score 50.0
      // This allows direct numerical comparison: lower score = faster
      const score = durationSec;

      return {
        score,
        label: 'measured',
        metadata: {
          durationMs: latency.durationMs,
          durationSec,
          durationMin: Math.round((durationSec / 60) * 100) / 100,
        },
      };
    },
  };
};
