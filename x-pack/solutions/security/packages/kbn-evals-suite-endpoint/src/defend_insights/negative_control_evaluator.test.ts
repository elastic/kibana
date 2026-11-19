/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createNegativeControlEvaluator } from './negative_control_evaluator';
import {
  AVAST_SVC,
  CHROME,
  avExpected,
  cleanExpected,
  insight,
  output,
  params,
  SEEDED_EVENT_COUNT,
} from './evaluator_test_fixtures';

describe('NegativeControl', () => {
  const { evaluate } = createNegativeControlEvaluator();

  it('passes when nothing is flagged', async () => {
    expect(await evaluate(params(output(), cleanExpected))).toMatchObject({
      score: 1,
      label: 'pass',
    });
  });

  it('fails when a benign executable is flagged', async () => {
    const out = output({ insights: [insight('Chrome', [CHROME])] });
    expect(await evaluate(params(out, cleanExpected))).toMatchObject({
      score: 0,
      label: 'fail',
      explanation: expect.stringContaining('chrome.exe'),
    });
  });

  it('fails when any insight is returned, even for a non-benign path, and lists the paths', async () => {
    const out = output({ insights: [insight('Avast', [AVAST_SVC])] });
    expect(await evaluate(params(out, cleanExpected))).toMatchObject({
      score: 0,
      label: 'fail',
      explanation: expect.stringContaining(AVAST_SVC),
    });
  });

  it.each([
    ['0 events', 0],
    ['fewer events than seeded', SEEDED_EVENT_COUNT - 1],
    ['no eventsContextCount', undefined],
  ])('is task_error, not a pass, when the model saw %s', async (_name, eventsContextCount) => {
    const out = output({ eventsContextCount });
    expect(await evaluate(params(out, cleanExpected))).toMatchObject({
      score: null,
      label: 'task_error',
    });
  });

  it('is N/A for non-control examples', async () => {
    expect(await evaluate(params(output(), avExpected))).toMatchObject({
      score: null,
      label: 'N/A',
    });
  });

  it.each(['timed_out', 'request_failed'] as const)('reports %s as task_error', async (status) => {
    const out = output({ status, insights: null });
    expect(await evaluate(params(out, cleanExpected))).toMatchObject({
      score: null,
      label: 'task_error',
    });
  });

  it('is N/A when the route reports failure', async () => {
    const out = output({ status: 'failed', insights: null });
    expect(await evaluate(params(out, cleanExpected))).toMatchObject({ score: null, label: 'N/A' });
  });
});
