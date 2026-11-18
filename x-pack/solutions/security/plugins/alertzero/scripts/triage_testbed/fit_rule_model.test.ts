/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { DEFAULT_CONFIG } from './fake_llm';
import type { FitRow } from './fit_rule_model';
import { ruleOutcomes, fitRuleModel, fitFromRuns } from './fit_rule_model';

const row = (
  ruleUuid: string,
  kind: string,
  truth: string,
  answer: FitRow['answer'],
  extra: Partial<FitRow> = {}
): FitRow => ({
  ruleUuid,
  kind,
  truth,
  answer,
  confidence: 0.9,
  variant: null,
  ...extra,
});

// Ten true positives of one rule in one run, `called` of them answered false positive.
const tps = (rule: string, kind: string, called: number, confidence: number = 0.9) =>
  Array.from({ length: 10 }, (_, i) =>
    row(rule, kind, 'tp', i < called ? 'fp' : 'tp', { confidence })
  );
const fps = (rule: string, kind: string) =>
  Array.from({ length: 10 }, () => row(rule, kind, 'fp', 'fp'));

// Rule "flaky" flips in runs 1 and 3 and not in run 2. Rule "steady" never flips. Rule "blind" is always read as false positive.
const rowsByRun = new Map<string, FitRow[]>([
  [
    'r1',
    [
      ...tps('flaky', 'aggregate', 10, 0.8),
      ...tps('steady', 'process', 0),
      ...tps('blind', 'cloud', 10),
      ...fps('steady', 'process'),
    ],
  ],
  [
    'r2',
    [
      ...tps('flaky', 'aggregate', 0),
      ...tps('steady', 'process', 0),
      ...tps('blind', 'cloud', 10),
      ...fps('steady', 'process'),
    ],
  ],
  [
    'r3',
    [
      ...tps('flaky', 'aggregate', 10, 0.8),
      ...tps('steady', 'process', 0),
      ...tps('blind', 'cloud', 10),
      ...fps('steady', 'process'),
    ],
  ],
]);

// A value that the test expects to be there: reading a missing one fails the test.
const required = <T>(value: T | null | undefined): T => {
  if (value === null || value === undefined) throw new Error('expected a value');
  return value;
};

describe('fit_rule_model', () => {
  it('marks a rule flipped in a run when at least half of its true positives got a false-positive verdict', () => {
    const flaky = required(ruleOutcomes(rowsByRun).find((rule) => rule.ruleUuid === 'flaky'));

    expect(flaky.perRun.map((r) => r.flipped)).toEqual([true, false, true]);
    expect(flaky.unstable).toBe(true);
  });

  it('leaves planted variants and inconclusive answers out of the outcome of a rule', () => {
    const rows = new Map([
      [
        'a',
        [
          ...tps('x', 'process', 0),
          row('x', 'process', 'tp', 'fp', { variant: 'new_hash' }),
          row('x', 'process', 'tp', 'inc'),
        ],
      ],
    ]);

    expect(ruleOutcomes(rows)[0].perRun[0]).toMatchObject({ settled: 10, calledFalsePositive: 0 });
  });

  it('takes a rule that flips in some runs as unstable, and a rule that flips in every run as a fixed misreading', () => {
    const fit = fitRuleModel(ruleOutcomes(rowsByRun));

    expect(fit.unstableRules).toEqual(['flaky']);
    expect(fit.alwaysFlippedRules).toEqual(['blind']);
    expect(fit.ruleModel.unstableRuleShare).toBeCloseTo(1 / 3, 3);
    expect(fit.ruleModel.unstableFlipChance).toBeCloseTo(2 / 3, 3);
  });

  it('cannot tell stability from a rule seen in one run only', () => {
    const fit = fitRuleModel(ruleOutcomes(new Map([['a', tps('once', 'process', 10)]])));

    expect(fit.comparableRules).toBe(0);
    expect(fit.ruleModel).toEqual({ unstableRuleShare: 0, unstableFlipChance: 0 });
  });

  it('keeps the alerts of unstable rules out of the per-alert flip rate, so that the batch is not counted twice', () => {
    const { flipRate, proposedConfig } = fitFromRuns({ rowsByRun, previous: DEFAULT_CONFIG });

    // Without the unstable rule: steady (30 true positives, 0 wrong) and blind (30, all wrong).
    expect(flipRate.truePositiveAsFalsePositive.count).toBe(30);
    expect(flipRate.truePositiveAsFalsePositive.of).toBe(60);
    expect(proposedConfig.ruleModel.unstableFlipChance).toBeCloseTo(2 / 3, 3);
  });

  it('fits the confidence of a kind only when at least 20 answers are behind it, and keeps the general one otherwise', () => {
    const { proposedConfig } = fitFromRuns({ rowsByRun, previous: DEFAULT_CONFIG });

    // process: 30 right true positives + 30 right false positives; aggregate has no answers outside the unstable rule.
    expect(required(proposedConfig.confidenceByKind.process.correct).quantiles).toHaveLength(11);
    expect(proposedConfig.confidenceByKind.aggregate).toBeUndefined();
  });

  it('counts the miss rate of a variant type over all runs', () => {
    const rows = new Map([
      [
        'a',
        [
          row('v', 'process', 'tp', 'fp', { variant: 'new_hash' }),
          row('v', 'process', 'tp', 'tp', { variant: 'encoded_command_line' }),
        ],
      ],
      [
        'b',
        [
          row('v', 'process', 'tp', 'fp', { variant: 'new_hash' }),
          row('v', 'process', 'tp', 'tp', { variant: 'encoded_command_line' }),
        ],
      ],
    ]);

    const { proposedConfig } = fitFromRuns({ rowsByRun: rows, previous: DEFAULT_CONFIG });

    expect(proposedConfig.variantMissRate).toEqual({ new_hash: 1, encoded_command_line: 0 });
  });

  it('fits the confidence of wrong answers from flipped batches and from variants that show a sign, not from invisible ones', () => {
    const rows = new Map([
      [
        'a',
        [
          ...tps('flaky', 'aggregate', 10, 0.8),
          row('s', 'process', 'tp', 'fp', { variant: 'untrusted_signer', confidence: 0.6 }),
          row('s', 'process', 'tp', 'fp', { variant: 'new_hash', confidence: 0.99 }),
        ],
      ],
      ['b', tps('flaky', 'aggregate', 0)],
    ]);

    const { proposedConfig } = fitFromRuns({ rowsByRun: rows, previous: DEFAULT_CONFIG });

    // 10 flipped answers at 0.8 and one visible variant miss at 0.6 (11 answers: a mean and a half width, no table). new_hash is left out.
    expect(proposedConfig.confidence.wrong.mean).toBeCloseTo(0.782, 2);
  });

  it('replaces an inconclusive distribution that the fake cannot sample', () => {
    const previous = {
      ...DEFAULT_CONFIG,
      confidence: { ...DEFAULT_CONFIG.confidence, inconclusive: [0.4, 0.7] },
    };

    const { proposedConfig } = fitFromRuns({ rowsByRun, previous });

    expect(proposedConfig.confidence.inconclusive).toEqual(DEFAULT_CONFIG.confidence.inconclusive);
  });
});
