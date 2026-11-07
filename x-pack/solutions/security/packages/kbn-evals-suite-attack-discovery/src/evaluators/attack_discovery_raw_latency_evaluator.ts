/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0. Use of this software is subject to the Elastic License 2.0.
 */

import type { Evaluator } from '@kbn/evals';
import type { AttackDiscoveryDatasetExample, AttackDiscoveryTaskOutput } from '../types';

export const ATTACK_DISCOVERY_RAW_LATENCY_EVALUATOR_NAME = 'Raw Latency';

interface GenerateApiRawOutput {
  latency_ms?: number;
}

const isGenerateApiRawOutput = (raw: unknown): raw is GenerateApiRawOutput => {
  return typeof raw === 'object' && raw !== null && 'latency_ms' in raw;
};

/**
 * End-to-end wall-clock latency of the Attack Discovery generation, from the
 * client that drove it. `generateApi` runs execute server-side as an async
 * Kibana job, so the trace-based `Latency` evaluator only sees the longest
 * single span and under-reports by ~95% on this suite; this evaluator reads
 * the `latency_ms` recorded around the full generate-then-poll cycle instead.
 */
export const createAttackDiscoveryRawLatencyEvaluator = (): Evaluator<
  AttackDiscoveryDatasetExample,
  AttackDiscoveryTaskOutput
> => {
  return {
    name: ATTACK_DISCOVERY_RAW_LATENCY_EVALUATOR_NAME,
    kind: 'CODE',
    direction: 'minimize',
    evaluate: async ({ output }) => {
      const raw = output?.raw;
      if (!isGenerateApiRawOutput(raw) || typeof raw.latency_ms !== 'number') {
        return { score: null, label: 'N/A', explanation: 'No raw latency recorded for this mode.' };
      }

      return { score: raw.latency_ms / 1000, label: 'seconds' };
    },
  };
};
