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
  SEEDED_EVENT_COUNT,
} from './evaluator_test_fixtures';

describe('ExpectedInsightGroups', () => {
  const { evaluate } = createExpectedInsightGroupsEvaluator();

  it('scores 1 when every check passes (case-insensitive group match)', async () => {
    const out = output({ insights: [insight('  AVAST ', [AVAST_SVC, AVAST_UI])] });
    expect(await evaluate(params(out, avExpected))).toMatchObject({ score: 1, label: 'pass' });
  });

  it('accepts the vendor name with a generic product suffix', async () => {
    const out = output({ insights: [insight('Avast Antivirus', [AVAST_SVC, AVAST_UI])] });
    expect(await evaluate(params(out, avExpected))).toMatchObject({ score: 1, label: 'pass' });
  });

  const vendorExpected = (name: string) => ({
    ...avExpected,
    results: [{ ...avExpected.results[0], name }],
  });

  it.each([
    ['Kaspersky Lab', 'Kaspersky'],
    ['Malwarebytes Inc', 'Malwarebytes'],
  ])('accepts the vendor-suffixed group "%s" for "%s"', async (group, vendor) => {
    const out = output({ insights: [insight(group, [AVAST_SVC, AVAST_UI])] });
    expect(await evaluate(params(out, vendorExpected(vendor)))).toMatchObject({
      score: 1,
      label: 'pass',
    });
  });

  it.each([
    ['Avastx', 'Avast'],
    ['Avastly Antivirus', 'Avast'],
  ])('does not match "%s" to "%s"', async (group, vendor) => {
    const out = output({ insights: [insight(group, [AVAST_SVC, AVAST_UI])] });
    expect(await evaluate(params(out, vendorExpected(vendor)))).toMatchObject({ label: 'fail' });
  });

  it('does not match a group that only contains the vendor name', async () => {
    const out = output({ insights: [insight('Not Avast related', [AVAST_SVC, AVAST_UI])] });
    expect(await evaluate(params(out, avExpected))).toMatchObject({ label: 'fail' });
  });

  it('never labels a failing run as pass, even when rounding would reach 1', async () => {
    const result = await evaluate(
      params(output({ insights: [insight('Avast', [AVAST_UI])] }), avExpected)
    );
    expect(result.label).toBe('fail');
    expect(result.score).toBeLessThan(1);
  });

  it('fails the missing-required check', async () => {
    const out = output({ insights: [insight('Avast', [AVAST_UI])] });
    expect(await evaluate(params(out, avExpected))).toMatchObject({ score: 0.67, label: 'fail' });
  });

  it('fails the excluded-path check (and counts it only once)', async () => {
    const out = output({ insights: [insight('Avast', [AVAST_SVC, CHROME])] });
    expect(await evaluate(params(out, avExpected))).toMatchObject({ score: 0.67 });
  });

  it('fails the unexpected-path check', async () => {
    const out = output({ insights: [insight('Avast', [AVAST_SVC, 'C:\\other\\tool.exe'])] });
    expect(await evaluate(params(out, avExpected))).toMatchObject({ score: 0.67 });
  });

  it('fails the match and the extra-group check when the group is wrong', async () => {
    const out = output({ insights: [insight('Kaspersky', [AVAST_SVC])] });
    // requirement unmatched (1) + unexpected group (1) of 4 checks
    expect(await evaluate(params(out, avExpected))).toMatchObject({ score: 0.5, label: 'fail' });
  });

  it('counts each unexpected extra group as one failed check', async () => {
    const out = output({
      insights: [insight('Avast', [AVAST_SVC]), insight('Chrome', [CHROME])],
    });
    // 3 checks for the Avast requirement + 1 for the extra group; the extra group fails.
    expect(await evaluate(params(out, avExpected))).toMatchObject({
      score: 0.75,
      label: 'fail',
      explanation: expect.stringContaining('unexpected insight group "Chrome"'),
    });
  });

  it('weighs two extra groups twice', async () => {
    const out = output({
      insights: [
        insight('Avast', [AVAST_SVC]),
        insight('Chrome', [CHROME]),
        insight('Edge', [CHROME]),
      ],
    });
    expect(await evaluate(params(out, avExpected))).toMatchObject({ score: 0.6 });
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

  it('is task_error when the model saw no seeded events', async () => {
    const out = output({ eventsContextCount: 0, insights: [] });
    expect(await evaluate(params(out, cleanExpected))).toMatchObject({
      score: null,
      label: 'task_error',
    });
    expect(
      await evaluate(params(output({ eventsContextCount: SEEDED_EVENT_COUNT - 1 }), avExpected))
    ).toMatchObject({ score: null, label: 'task_error' });
  });

  it('is N/A without expected output', async () => {
    expect(await evaluate(params(output()))).toMatchObject({ score: null, label: 'N/A' });
  });
});
