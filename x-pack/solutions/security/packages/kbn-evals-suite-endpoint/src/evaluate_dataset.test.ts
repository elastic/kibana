/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  deriveEndpointGoldenToolSequence,
  ENDPOINT_BASELINE_TOOL_SEQUENCE,
  createEndpointTrajectoryEvaluator,
  createEndpointExpectedToolCalledEvaluator,
} from './evaluate_dataset';

describe('deriveEndpointGoldenToolSequence', () => {
  it('uses explicit tool_sequence when provided', () => {
    expect(
      deriveEndpointGoldenToolSequence({
        criteria: [],
        tool_sequence: ['security.alerts', 'automatic_troubleshooting.generate_insight'],
      })
    ).toEqual(['security.alerts', 'automatic_troubleshooting.generate_insight']);
  });

  it('falls back to baseline troubleshooting sequence', () => {
    expect(deriveEndpointGoldenToolSequence({ criteria: ['x'] })).toEqual([
      ...ENDPOINT_BASELINE_TOOL_SEQUENCE,
    ]);
  });
});

describe('createEndpointTrajectoryEvaluator', () => {
  it('registers Trajectory evaluator name for matrix L2 rollup', () => {
    expect(createEndpointTrajectoryEvaluator().name).toBe('Trajectory');
  });
});

describe('createEndpointExpectedToolCalledEvaluator', () => {
  it('registers ExpectedToolCalled evaluator name for matrix L4 rollup', () => {
    expect(createEndpointExpectedToolCalledEvaluator().name).toBe('ExpectedToolCalled');
  });

  it('scores 0 when the expected entry-point tool was not called', async () => {
    const evaluator = createEndpointExpectedToolCalledEvaluator();
    // No tool_sequence → falls back to ENDPOINT_BASELINE_TOOL_SEQUENCE; empty steps → tool never called.
    const result = await evaluator.evaluate({
      output: { steps: [] } as never,
      expected: { criteria: [] },
    } as never);
    expect(result.score).toBe(0);
  });

  it('scores 1 when the expected entry-point tool was called', async () => {
    const evaluator = createEndpointExpectedToolCalledEvaluator();
    const baseline = ENDPOINT_BASELINE_TOOL_SEQUENCE[0];
    const result = await evaluator.evaluate({
      output: {
        steps: [{ type: 'tool_call', tool_id: baseline }],
      } as never,
      expected: { criteria: [] },
    } as never);
    expect(result.score).toBe(1);
  });
});
