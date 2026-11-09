/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createGenerationSucceededEvaluator } from './generation_succeeded_evaluator';
import { output, params } from './evaluator_test_fixtures';

describe('GenerationSucceeded', () => {
  const { evaluate } = createGenerationSucceededEvaluator();

  it('passes on a succeeded generation', async () => {
    expect(await evaluate(params(output()))).toMatchObject({ score: 1, label: 'pass' });
  });

  it.each(['failed', 'canceled'] as const)('scores 0 when the route reports %s', async (status) => {
    expect(await evaluate(params(output({ status, insights: null, error: 'boom' })))).toMatchObject(
      {
        score: 0,
        label: 'fail',
        explanation: 'boom',
      }
    );
  });

  it.each(['timed_out', 'request_failed'] as const)(
    'reports %s as task_error, not a miss',
    async (status) => {
      expect(
        await evaluate(params(output({ status, insights: null, error: 'infra' })))
      ).toMatchObject({
        score: null,
        label: 'task_error',
      });
    }
  );
});
