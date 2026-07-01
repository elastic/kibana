/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  createEntityAnalyticsTrajectoryEvaluator,
  deriveEntityAnalyticsGoldenToolSequence,
} from './evaluate_dataset';

describe('deriveEntityAnalyticsGoldenToolSequence', () => {
  it('prefers explicit tool_sequence', () => {
    expect(
      deriveEntityAnalyticsGoldenToolSequence({
        tool_sequence: ['security.get_entity'],
      })
    ).toEqual(['security.get_entity']);
  });

  it('derives from toolCalls primary ids in order', () => {
    expect(
      deriveEntityAnalyticsGoldenToolSequence({
        toolCalls: [
          { id: 'find.security.ml.jobs' },
          { id: 'security.entity_analytics.risk_score' },
        ],
      })
    ).toEqual(['find.security.ml.jobs', 'security.entity_analytics.risk_score']);
  });

  it('returns empty when no annotations', () => {
    expect(deriveEntityAnalyticsGoldenToolSequence({ criteria: ['x'] })).toEqual([]);
  });
});

describe('createEntityAnalyticsTrajectoryEvaluator', () => {
  it('returns N/A when golden sequence is empty', async () => {
    const evaluator = createEntityAnalyticsTrajectoryEvaluator();
    const result = await evaluator.evaluate({
      input: { question: 'test' },
      expected: { criteria: ['only criteria'] },
      output: { steps: [] },
      metadata: {},
    });
    expect(result.label).toBe('N/A');
  });

  it('registers Trajectory evaluator name for matrix L2 rollup', () => {
    expect(createEntityAnalyticsTrajectoryEvaluator().name).toBe('Trajectory');
  });
});
