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

      // Score inversely proportional to latency
      // Sub-10s = 1.0, 10-30s = 0.5, >30s = 0.2
      const durationSec = latency.durationMs / 1000;
      let score = 1.0;

      if (durationSec > 10 && durationSec <= 30) {
        score = 0.5;
      } else if (durationSec > 30) {
        score = 0.2;
      }

      return {
        score,
        label: 'measured',
        metadata: {
          durationMs: latency.durationMs,
          durationSec,
        },
      };
    },
  };
};
