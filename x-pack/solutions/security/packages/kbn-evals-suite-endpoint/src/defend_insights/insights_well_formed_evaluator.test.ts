/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createInsightsWellFormedEvaluator } from './insights_well_formed_evaluator';
import {
  AVAST_SVC,
  avExpected,
  cleanExpected,
  insight,
  output,
  params,
  SEEDED_EVENT_COUNT,
} from './evaluator_test_fixtures';

describe('InsightsWellFormed', () => {
  const { evaluate } = createInsightsWellFormedEvaluator();

  it('passes for well-formed insights', async () => {
    const out = output({ insights: [insight('Avast', [AVAST_SVC])] });
    expect(await evaluate(params(out, avExpected))).toMatchObject({ score: 1, label: 'pass' });
  });

  it('fails an empty result when insights were expected', async () => {
    expect(await evaluate(params(output(), avExpected))).toMatchObject({ score: 0, label: 'fail' });
  });

  it('passes an empty result for the negative control', async () => {
    expect(await evaluate(params(output(), cleanExpected))).toMatchObject({
      score: 1,
      label: 'pass',
    });
  });

  it('is task_error, not a pass, for an empty result on a host the model saw no events for', async () => {
    const out = output({ eventsContextCount: 0, insights: [] });
    expect(await evaluate(params(out, cleanExpected))).toMatchObject({
      score: null,
      label: 'task_error',
    });
    expect(
      await evaluate(params(output({ eventsContextCount: SEEDED_EVENT_COUNT - 1 }), cleanExpected))
    ).toMatchObject({ score: null, label: 'task_error' });
  });

  it('fails an insight with a blank group', async () => {
    const out = output({ insights: [insight('  ', [AVAST_SVC])] });
    expect(await evaluate(params(out, avExpected))).toMatchObject({ score: 0, label: 'fail' });
  });

  it('fails an insight without events', async () => {
    const out = output({ insights: [{ group: 'Avast', events: [] }] });
    expect(await evaluate(params(out, avExpected))).toMatchObject({ score: 0, label: 'fail' });
  });

  it('fails an event with an empty value', async () => {
    const out = output({ insights: [insight('Avast', [''])] });
    expect(await evaluate(params(out, avExpected))).toMatchObject({ score: 0, label: 'fail' });
  });

  it('is N/A when the generation did not succeed', async () => {
    const out = output({ status: 'failed', insights: null });
    expect(await evaluate(params(out, avExpected))).toMatchObject({ score: null, label: 'N/A' });
  });

  it('reports infra failures as task_error', async () => {
    const out = output({ status: 'timed_out', insights: null });
    expect(await evaluate(params(out, avExpected))).toMatchObject({
      score: null,
      label: 'task_error',
    });
  });
});
