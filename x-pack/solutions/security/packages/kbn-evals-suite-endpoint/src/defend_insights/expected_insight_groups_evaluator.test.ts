/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createExpectedInsightGroupsEvaluator } from './expected_insight_groups_evaluator';
import {
  AVAST_SVC,
  AVAST_UI,
  CHROME,
  avExpected,
  cleanExpected,
  insight,
  output,
  params,
} from './evaluator_test_fixtures';

describe('ExpectedInsightGroups', () => {
  const { evaluate } = createExpectedInsightGroupsEvaluator();

  it('scores 1 when every check passes (case-insensitive group match)', async () => {
    const out = output({ insights: [insight('avast antivirus', [AVAST_SVC, AVAST_UI])] });
    expect(await evaluate(params(out, avExpected))).toMatchObject({ score: 1, label: 'pass' });
  });

  it('fails the missing-required check', async () => {
    const out = output({ insights: [insight('Avast', [AVAST_UI])] });
    expect(await evaluate(params(out, avExpected))).toMatchObject({ score: 0.75, label: 'fail' });
  });

  it('fails the excluded-path check (and counts it only once)', async () => {
    const out = output({ insights: [insight('Avast', [AVAST_SVC, CHROME])] });
    expect(await evaluate(params(out, avExpected))).toMatchObject({ score: 0.75 });
  });

  it('fails the unexpected-path check', async () => {
    const out = output({ insights: [insight('Avast', [AVAST_SVC, 'C:\\other\\tool.exe'])] });
    expect(await evaluate(params(out, avExpected))).toMatchObject({ score: 0.75 });
  });

  it('fails group-count and match checks when the group is wrong', async () => {
    const out = output({ insights: [insight('Kaspersky', [AVAST_SVC])] });
    // group count ok (1/1); requirement did not match (1 failed of 4)
    expect(await evaluate(params(out, avExpected))).toMatchObject({ score: 0.75, label: 'fail' });
  });

  it('fails the group-count check when an extra group is returned', async () => {
    const out = output({
      insights: [insight('Avast', [AVAST_SVC]), insight('Chrome', [CHROME])],
    });
    expect(await evaluate(params(out, avExpected))).toMatchObject({ score: 0.75 });
  });

  it('scores 0 when insights were expected but none returned', async () => {
    expect(await evaluate(params(output(), avExpected))).toMatchObject({ score: 0, label: 'fail' });
  });

  it('passes an empty result on the negative control', async () => {
    expect(await evaluate(params(output(), cleanExpected))).toMatchObject({
      score: 1,
      label: 'pass',
    });
  });

  it('fails when the negative control returns a group', async () => {
    const out = output({ insights: [insight('Chrome', [CHROME])] });
    expect(await evaluate(params(out, cleanExpected))).toMatchObject({ score: 0, label: 'fail' });
  });

  it('scores 0 when the route reports failure', async () => {
    const out = output({ status: 'failed', insights: null, error: 'graph failed' });
    expect(await evaluate(params(out, avExpected))).toMatchObject({ score: 0, label: 'fail' });
  });

  it.each(['timed_out', 'request_failed'] as const)('reports %s as task_error', async (status) => {
    const out = output({ status, insights: null, error: 'infra' });
    expect(await evaluate(params(out, avExpected))).toMatchObject({
      score: null,
      label: 'task_error',
    });
  });

  it('is N/A without expected output', async () => {
    expect(await evaluate(params(output()))).toMatchObject({ score: null, label: 'N/A' });
  });
});
