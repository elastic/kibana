/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { AUDIT_SCENARIOS } from '../audit_failure_classes/registry';
import { createAuditPositiveControlRecallEvaluator } from './audit_positive_control_recall_evaluator';
import {
  emptyInput,
  makeDiscovery,
  makeGold,
  makeOutput,
  resolveReferenceFromMetadata,
} from './audit_test_utils';

const evaluator = createAuditPositiveControlRecallEvaluator(resolveReferenceFromMetadata);

const gold = makeGold({
  alertGroups: { chain: ['c1', 'c2', 'c3', 'c4', 'c5'], noise: ['n1'] },
  requiredGroup: 'chain',
});

const run = (alertIds: string[][], g = gold) =>
  evaluator.evaluate({
    input: emptyInput,
    output: makeOutput(alertIds.map((ids) => makeDiscovery({ alertIds: ids }))),
    expected: undefined,
    metadata: { gold: g },
  } as never);

describe('PositiveControlRecall evaluator', () => {
  it('scores 1 when every required alert is cited', async () => {
    expect(await run([['c1', 'c2', 'c3', 'c4', 'c5']])).toMatchObject({
      score: 1,
      label: 'recalled',
    });
  });

  it('unions citations across discoveries', async () => {
    expect(
      await run([
        ['c1', 'c2'],
        ['c3', 'c4'],
      ])
    ).toMatchObject({ score: 0.8 });
  });

  it('labels recall at the 0.6 threshold as recalled', async () => {
    expect(await run([['c1', 'c2', 'c3']])).toMatchObject({ score: 0.6, label: 'recalled' });
  });

  it('labels recall below the threshold as missed', async () => {
    expect(await run([['c1', 'c2']])).toMatchObject({ score: 0.4, label: 'missed' });
  });

  it('ignores citations of unrelated alerts', async () => {
    expect(await run([['n1']])).toMatchObject({ score: 0, label: 'missed' });
  });

  it('scores 0 when nothing is reported', async () => {
    expect(await run([])).toMatchObject({ score: 0, label: 'missed' });
  });

  it('is N/A when the scenario has no required group', async () => {
    const result = await run([['c1']], makeGold({ alertGroups: { chain: ['c1'] } }));
    expect(result).toMatchObject({ score: null, label: 'N/A' });
  });

  describe('requiredAnyOf', () => {
    const anyOf = makeGold({
      alertGroups: { prod: ['p1', 'p2', 'p3'], sandbox: ['s1', 's2', 's3'] },
      requiredAnyOf: ['prod', 'sandbox'],
    });

    it('scores 1 when either group is fully recalled', async () => {
      expect(await run([['s1', 's2', 's3']], anyOf)).toMatchObject({ score: 1, label: 'recalled' });
      expect(await run([['p1', 'p2', 'p3']], anyOf)).toMatchObject({ score: 1, label: 'recalled' });
    });

    it('takes the best recall over the groups, not the sum', async () => {
      const result = await run([['p1', 's1', 's2']], anyOf);
      expect(result).toMatchObject({ label: 'recalled' });
      expect(result).toMatchObject({ score: 2 / 3 });
      expect((result as { explanation?: string }).explanation).toContain('best of prod, sandbox');
    });

    it('scores 0 when neither group is cited', async () => {
      expect(await run([[]], anyOf)).toMatchObject({ score: 0, label: 'missed' });
    });
  });

  describe('forbidden merges', () => {
    const forbiddenPair = [['prod', 'sandbox']] as const;
    const anyOf = makeGold({
      alertGroups: { prod: ['p1', 'p2', 'p3'], sandbox: ['s1', 's2', 's3'] },
      requiredAnyOf: ['prod', 'sandbox'],
      forbiddenCoCitation: forbiddenPair,
    });
    const merged = ['p1', 'p2', 'p3', 's1', 's2', 's3'];

    it('scores 0 for one discovery merging both groups under requiredAnyOf', async () => {
      expect(await run([merged], anyOf)).toMatchObject({ score: 0, label: 'missed' });
    });

    it('scores 0 for requiredGroup cited together with a forbidden partner', async () => {
      const required = makeGold({
        alertGroups: { prod: ['p1', 'p2', 'p3'], sandbox: ['s1', 's2', 's3'] },
        requiredGroup: 'prod',
        forbiddenCoCitation: forbiddenPair,
      });
      expect(await run([merged], required)).toMatchObject({ score: 0, label: 'missed' });
    });

    it('still scores 1 for a correct discovery next to an unrelated one', async () => {
      expect(await run([['p1', 'p2', 'p3'], ['x1']], anyOf)).toMatchObject({
        score: 1,
        label: 'recalled',
      });
    });

    it('credits the clean discovery when a merged one is reported beside it', async () => {
      expect(await run([['p1', 'p2', 'p3'], merged], anyOf)).toMatchObject({ score: 1 });
    });

    it('counts only the discoveries that stay clear of the partner', async () => {
      expect(await run([['p1'], ['p2', 's1']], anyOf)).toMatchObject({ score: 1 / 3 });
    });

    it('does not count a discovery joining the positive chain with the cloud noise', async () => {
      const scenario = AUDIT_SCENARIOS.find(({ id }) => id === 'positive-chain-with-noise');
      if (!scenario) throw new Error('positive-chain-with-noise scenario missing');
      const { alertGroups, forbiddenCoCitation } = scenario.gold;
      const chain = alertGroups['clickfix-chain'];
      expect(chain.length).toBeGreaterThan(0);
      expect(forbiddenCoCitation.length).toBeGreaterThan(0);

      for (const [, noiseGroup] of forbiddenCoCitation) {
        const joined = await run([[...chain, ...alertGroups[noiseGroup]]], scenario.gold);
        expect(joined).toMatchObject({ score: 0, label: 'missed' });
      }
      const clean = await run([[...chain]], scenario.gold);
      expect(clean).toMatchObject({ score: 1, label: 'recalled' });
    });
  });
});
