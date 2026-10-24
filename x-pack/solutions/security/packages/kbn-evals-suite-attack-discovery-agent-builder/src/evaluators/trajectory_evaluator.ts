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
import { partitionToolCalls } from './tool_call_accounting';

// Distinct from the framework's `trajectory` evaluator, which computes a
// different metric (0.5 x LCS-order + 0.5 x set-coverage) under that name.
// The matrix report reads score docs back by evaluator name, so the two must
// not collide.
export const TRAJECTORY_EVALUATOR_NAME = 'StrictTrajectory';

export const createStrictTrajectoryEvaluator = ({
  extractToolCalls,
  goldenPathExtractor,
}: {
  extractToolCalls: (output: AttackDiscoveryAgentBuilderTaskOutput) => string[];
  goldenPathExtractor: (expected: unknown) => string[];
}): Evaluator<AttackDiscoveryAgentBuilderExample, AttackDiscoveryAgentBuilderTaskOutput> => ({
  name: TRAJECTORY_EVALUATOR_NAME,
  kind: 'CODE',
  direction: 'maximize',
  evaluate: async ({ input, output, expected }) => {
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

    // The routing requirement — the expected tools appearing in order — is
    // asserted above. Precision then counts only the calls that ARE routing
    // decisions: the harness call, the platform's plan-tracking and report
    // write-back, and the fixture's own attachment read are not choices the
    // model made, so scoring them against the expected path penalises
    // compliance. `tool_call_accounting` holds that rule once, shared with
    // `CostPerAlert`, so both metrics grade the same work.
    const { investigativeToolCalls: routingToolCalls, excludedToolCalls } = partitionToolCalls(
      actual,
      input
    );
    const score = expectedPath.length / Math.max(routingToolCalls.length, expectedPath.length);
    return {
      score,
      explanation: `Expected path found in order. ${actual.length} total tool calls (${
        routingToolCalls.length
      } routing, ${excludedToolCalls.length} platform bookkeeping, ${
        expectedPath.length
      } expected). Precision: ${score.toFixed(3)}.`,
      metadata: {
        actualPath: actual,
        expectedPath,
        routingToolCalls,
        excludedToolCalls,
      },
    };
  },
});
