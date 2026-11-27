/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createExpectedInsightGroupsEvaluator } from './expected_insight_groups_evaluator';
import { createGenerationSucceededEvaluator } from './generation_succeeded_evaluator';
import { createInsightsWellFormedEvaluator } from './insights_well_formed_evaluator';
import { createNegativeControlEvaluator } from './negative_control_evaluator';
import { cleanExpected, output, params, SEEDED_EVENT_COUNT } from './evaluator_test_fixtures';

/**
 * The route marks a run `succeeded` with empty insights even when the model was sent no events
 * (anonymization lookup failure, seeding missed by the retriever). On the clean host that used to
 * score 1 on every evaluator without testing anything.
 */
describe('clean-host false green', () => {
  const evaluators = [
    createGenerationSucceededEvaluator(),
    createInsightsWellFormedEvaluator(),
    createExpectedInsightGroupsEvaluator(),
    createNegativeControlEvaluator(),
  ];

  it.each([
    ['0 events', 0],
    ['fewer events than seeded', SEEDED_EVENT_COUNT - 1],
    ['a missing count', undefined],
  ])('scores no evaluator 1 when the model saw %s', async (_name, eventsContextCount) => {
    const out = output({ status: 'succeeded', insights: [], eventsContextCount });
    for (const { name, evaluate } of evaluators) {
      const result = await evaluate(params(out, cleanExpected));
      expect({ name, score: result.score }).not.toEqual({ name, score: 1 });
      expect({ name, label: result.label }).toEqual({ name, label: 'task_error' });
    }
  });

  it('still scores 1 when the model saw every seeded executable and found nothing', async () => {
    const out = output({
      status: 'succeeded',
      insights: [],
      eventsContextCount: SEEDED_EVENT_COUNT,
    });
    for (const { name, evaluate } of evaluators) {
      const result = await evaluate(params(out, cleanExpected));
      expect({ name, score: result.score }).toEqual({ name, score: 1 });
    }
  });
});
