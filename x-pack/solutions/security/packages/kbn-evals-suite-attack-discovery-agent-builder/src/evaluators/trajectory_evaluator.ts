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

// Distinct from the framework's `trajectory` evaluator, which computes a
// different metric (0.5 x LCS-order + 0.5 x set-coverage) under that name.
// The matrix report reads score docs back by evaluator name, so the two must
// not collide.
export const TRAJECTORY_EVALUATOR_NAME = 'StrictTrajectory';

// Calls the harness pays on every run, whatever route the model picks.
// `load_skill` is how the skill that carries the expected tool path is reached,
// so it has never counted against precision.
const HARNESS_TOOL_CALLS = ['load_skill'];

/**
 * Calls the EXAMPLE's own contract forces on a compliant run.
 *
 * An example that hands its alerts as an attachment cannot be answered without
 * reading that attachment, so the read is the fixture's requirement and not a
 * routing decision the model made. Counting it capped every compliant run of
 * `provided-alerts` and `multiple-alert-sets` at `1 expected / (1 expected + 1
 * attachment read)` = 0.5: the routing requirement was satisfied and the metric
 * still could not reach its own ceiling, so it measured the fixture rather than
 * the model (F23b, build 01a14b73).
 *
 * The exclusion is conditional on the example declaring attachments, so an
 * attachment read on an example that ships none is still counted as the
 * mis-route it is.
 */
const fixtureRequiredToolCalls = (
  input: AttackDiscoveryAgentBuilderExample['input'] | undefined
): string[] => (input?.attachments?.length ? ['attachments.read'] : []);

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
    // decisions: the harness calls and the steps the fixture's own contract
    // requires are not choices the model made, so scoring them against the
    // expected path penalises compliance.
    const nonRoutingToolCalls = new Set([
      ...HARNESS_TOOL_CALLS,
      ...fixtureRequiredToolCalls(input),
    ]);
    const routingToolCalls = actual.filter((tool) => !nonRoutingToolCalls.has(tool));
    const score = expectedPath.length / Math.max(routingToolCalls.length, expectedPath.length);
    return {
      score,
      explanation: `Expected path found in order. ${actual.length} total tool calls (${
        routingToolCalls.length
      } routing, ${expectedPath.length} expected). Precision: ${score.toFixed(3)}.`,
      metadata: {
        actualPath: actual,
        expectedPath,
        routingToolCalls,
        excludedToolCalls: actual.filter((tool) => nonRoutingToolCalls.has(tool)),
      },
    };
  },
});
