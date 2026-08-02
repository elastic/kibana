/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Evaluator } from '@kbn/evals';
import type {
  AttackDiscoveryAgentBuilderExample,
  AttackDiscoveryAgentBuilderTaskOutput,
} from '../types';

export const TRAJECTORY_EVALUATOR_NAME = 'trajectory';

export const createStrictTrajectoryEvaluator = ({
  extractToolCalls,
  goldenPathExtractor,
}: {
  extractToolCalls: (output: AttackDiscoveryAgentBuilderTaskOutput) => string[];
  goldenPathExtractor: (expected: unknown) => string[];
}): Evaluator<AttackDiscoveryAgentBuilderExample, AttackDiscoveryAgentBuilderTaskOutput> => ({
  name: TRAJECTORY_EVALUATOR_NAME,
  kind: 'CODE',
  evaluate: async ({ output, expected }) => {
    const actual = extractToolCalls(output);
    const expectedPath = goldenPathExtractor(expected);

    if (expectedPath.length === 0) {
      return {
        score: null,
        label: 'N/A',
        explanation: 'No expected tool path defined for this example.',
      };
    }

    let expectedIndex = 0;
    for (const tool of actual) {
      if (tool === expectedPath[expectedIndex]) {
        expectedIndex++;
        if (expectedIndex === expectedPath.length) break;
      }
    }

    if (expectedIndex !== expectedPath.length) {
      return {
        score: 0,
        explanation: `Expected path [${expectedPath.join(
          ' -> '
        )}] not found in actual path [${actual.join(' -> ')}].`,
        metadata: { actualPath: actual, expectedPath },
      };
    }

    // Natural routing always pays a load_skill call; exclude it from precision scoring.
    const precisionDenominator = actual.filter((tool) => tool !== 'load_skill').length;
    const score = expectedPath.length / Math.max(precisionDenominator, expectedPath.length);
    return {
      score,
      explanation: `Expected path found in order. ${
        actual.length
      } total tool calls (${precisionDenominator} excluding load_skill), ${
        expectedPath.length
      } expected. Precision: ${score.toFixed(3)}.`,
      metadata: { actualPath: actual, expectedPath, precisionDenominator },
    };
  },
});
