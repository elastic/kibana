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

/**
 * Wraps a trace-based evaluator so it reports N/A instead of scoring when the
 * example ran in `generateApi` mode. In that mode the generation executes
 * server-side as an async Kibana job, outside the client-side span tree, so
 * trace-derived Latency/Tool Calls misrepresent the run:
 * - Latency under-reports by ~95% (longest single span vs the full
 *   generate-then-poll cycle; see `createAttackDiscoveryRawLatencyEvaluator`).
 * - Tool Calls is 0 on every recorded run of this suite.
 * Trace-based token counts remain valid there and stay enabled.
 */
export const skipForGenerateApiMode = <
  TExample extends AttackDiscoveryDatasetExample = AttackDiscoveryDatasetExample
>(
  evaluator: Evaluator<TExample, AttackDiscoveryTaskOutput>
): Evaluator<TExample, AttackDiscoveryTaskOutput> => {
  return {
    name: evaluator.name,
    kind: evaluator.kind,
    direction: evaluator.direction,
    ...(evaluator.getModel ? { getModel: evaluator.getModel } : {}),
    ...(evaluator.getVersion ? { getVersion: evaluator.getVersion } : {}),
    evaluate: async (params) => {
      if (params.input?.mode === 'generateApi') {
        return {
          score: null,
          label: 'N/A',
          explanation:
            'Trace-based measurement is not meaningful for generateApi mode (server-side async job).',
        };
      }
      return evaluator.evaluate(params);
    },
  };
};
