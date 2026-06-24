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
