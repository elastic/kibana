/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ComparisonResult } from '@kbn/evals-common';
import { applyHolmCorrection } from '@kbn/evals-common';
import { evaluateRegressionGate, formatRegressionGateReport } from './regression_gate';

const makeResult = (overrides: Partial<ComparisonResult> = {}): ComparisonResult => ({
  datasetId: 'ds-1',
  datasetName: 'Dataset One',
  evaluatorName: 'Correctness',
  sampleSize: 20,
  meanTarget: 0.6,
  meanBaseline: 0.8,
  pValue: 0.01,
  direction: 'maximize',
  metricType: 'continuous_bounded',
  hypothesisTest: { id: 'wilcoxon_signed_rank', method: 'exact', statistic: 5 },
  ...overrides,
});

describe('evaluateRegressionGate', () => {
  it('trips on a significant drop in a higher-is-better evaluator', () => {
    const decision = evaluateRegressionGate({ results: [makeResult()] });

    expect(decision.tripped).toBe(true);
    expect(decision.regressions).toEqual([
      expect.objectContaining({
        evaluatorName: 'Correctness',
        pValue: 0.01,
        adjustedPValue: null,
        testId: 'wilcoxon_signed_rank',
        sampleSize: 20,
      }),
    ]);
    expect(decision.regressions[0].delta).toBeCloseTo(-0.2, 10);
  });

  it('trips on a significant rise in a lower-is-better evaluator', () => {
    const decision = evaluateRegressionGate({
      results: [
        makeResult({
          evaluatorName: 'Latency',
          direction: 'minimize',
          meanTarget: 5,
          meanBaseline: 3,
        }),
      ],
    });

    expect(decision.tripped).toBe(true);
    expect(decision.regressions[0].delta).toBeCloseTo(2, 10);
  });

  it('does not trip on a significant improvement, in either direction', () => {
    const decision = evaluateRegressionGate({
      results: [
        makeResult({ meanTarget: 0.9, meanBaseline: 0.7 }),
        makeResult({
          evaluatorName: 'Latency',
          direction: 'minimize',
          meanTarget: 2,
          meanBaseline: 3,
        }),
      ],
    });

    expect(decision.tripped).toBe(false);
    expect(decision.regressions).toEqual([]);
  });

  it('does not trip on a non-significant drop, a null p-value, or a neutral evaluator', () => {
    const decision = evaluateRegressionGate({
      results: [
        makeResult({ evaluatorName: 'NotSignificant', pValue: 0.2 }),
        makeResult({ evaluatorName: 'NoPValue', pValue: null }),
        makeResult({ evaluatorName: 'Neutral', direction: 'neutral' }),
      ],
    });

    expect(decision.tripped).toBe(false);
  });

  it('does not trip when the means are equal, whatever the p-value', () => {
    const decision = evaluateRegressionGate({
      results: [
        makeResult({ meanTarget: 0.7, meanBaseline: 0.7, pValue: 0.001 }),
        makeResult({
          evaluatorName: 'Latency',
          direction: 'minimize',
          meanTarget: 3,
          meanBaseline: 3,
          pValue: 0.001,
        }),
      ],
    });

    expect(decision.tripped).toBe(false);
    expect(decision.checked).toBe(2);
  });

  it('reports insufficient pairs without tripping, even for a large significant drop', () => {
    const decision = evaluateRegressionGate({
      results: [makeResult({ sampleSize: 4 })],
      minPairs: 10,
    });

    expect(decision.tripped).toBe(false);
    expect(decision.insufficientPairs).toEqual([
      { datasetName: 'Dataset One', evaluatorName: 'Correctness', sampleSize: 4 },
    ]);
  });

  it('uses --min-pairs as an inclusive lower bound', () => {
    expect(
      evaluateRegressionGate({ results: [makeResult({ sampleSize: 10 })], minPairs: 10 }).tripped
    ).toBe(true);
    expect(
      evaluateRegressionGate({ results: [makeResult({ sampleSize: 9 })], minPairs: 10 }).tripped
    ).toBe(false);
  });

  it('limits the gate to the listed evaluators', () => {
    const results = [
      makeResult({ evaluatorName: 'Correctness' }),
      makeResult({ evaluatorName: 'Groundedness' }),
    ];

    const scoped = evaluateRegressionGate({ results, evaluators: ['Groundedness'] });
    expect(scoped.regressions.map((r) => r.evaluatorName)).toEqual(['Groundedness']);

    const none = evaluateRegressionGate({ results, evaluators: ['Relevance'] });
    expect(none.tripped).toBe(false);
    expect(none.insufficientPairs).toEqual([]);

    const all = evaluateRegressionGate({ results, evaluators: [] });
    expect(all.regressions).toHaveLength(2);
  });

  it('judges significance on the Holm-adjusted p-value when a correction was applied', () => {
    // 10 comparisons, one raw p of 0.03 (below alpha) that Holm lifts to 0.3.
    const results = Array.from({ length: 10 }, (_, i) =>
      makeResult({ evaluatorName: `E${i}`, pValue: i === 0 ? 0.03 : 0.9 })
    );

    expect(evaluateRegressionGate({ results }).tripped).toBe(true);

    const corrected = evaluateRegressionGate({ results: applyHolmCorrection(results) });
    expect(corrected.tripped).toBe(false);
  });

  it('still trips when the drop survives Holm correction and reports both p-values', () => {
    const results = [
      makeResult({ evaluatorName: 'Strong', pValue: 0.001 }),
      makeResult({ evaluatorName: 'Other', pValue: 0.8, meanTarget: 0.8, meanBaseline: 0.8 }),
    ];

    const decision = evaluateRegressionGate({ results: applyHolmCorrection(results) });

    expect(decision.tripped).toBe(true);
    expect(decision.regressions[0]).toEqual(
      expect.objectContaining({ pValue: 0.001, adjustedPValue: 0.002, effectivePValue: 0.002 })
    );
  });

  it('honours a custom significance threshold', () => {
    const results = [makeResult({ pValue: 0.03 })];

    expect(evaluateRegressionGate({ results, significanceThreshold: 0.01 }).tripped).toBe(false);
    expect(evaluateRegressionGate({ results, significanceThreshold: 0.05 }).tripped).toBe(true);
  });
});

describe('evaluateRegressionGate inconclusive outcomes', () => {
  it('is inconclusive, not passed, when every row has too few pairs', () => {
    const decision = evaluateRegressionGate({
      results: [
        makeResult({ evaluatorName: 'A', sampleSize: 3 }),
        makeResult({ evaluatorName: 'B', sampleSize: 9 }),
      ],
      minPairs: 10,
    });

    expect(decision.status).toBe('inconclusive');
    expect(decision.checked).toBe(0);
    expect(decision.tripped).toBe(false);
    expect(decision.insufficientPairs).toHaveLength(2);

    const report = formatRegressionGateReport({ decision, minPairs: 10 });
    expect(report).not.toContain('passed');
    expect(report).toContain('inconclusive');
    expect(report).toContain('A: insufficient pairs (n=3)');
  });

  it('is inconclusive when every row with enough pairs has a null or NaN p-value', () => {
    const decision = evaluateRegressionGate({
      results: [
        makeResult({ evaluatorName: 'NullP', pValue: null }),
        makeResult({ evaluatorName: 'NanP', pValue: NaN, sampleSize: 12 }),
      ],
    });

    expect(decision.status).toBe('inconclusive');
    expect(decision.checked).toBe(0);
    expect(decision.untestable).toEqual([
      { datasetName: 'Dataset One', evaluatorName: 'NullP', sampleSize: 20 },
      { datasetName: 'Dataset One', evaluatorName: 'NanP', sampleSize: 12 },
    ]);

    const report = formatRegressionGateReport({ decision });
    expect(report).not.toContain('passed');
    expect(report).toContain('NullP: no usable p-value (n=20)');
    expect(report).toContain('NanP: no usable p-value (n=12)');
  });

  it('is inconclusive when the scope matches only neutral evaluators', () => {
    const decision = evaluateRegressionGate({
      results: [
        makeResult({ evaluatorName: 'Neutral', direction: 'neutral' }),
        makeResult({ evaluatorName: 'Correctness' }),
      ],
      evaluators: ['Neutral'],
    });

    expect(decision.status).toBe('inconclusive');
    expect(decision.checked).toBe(0);
    expect(decision.neutralSkipped).toBe(1);
    expect(decision.tripped).toBe(false);
    const report = formatRegressionGateReport({ decision });
    expect(report).not.toContain('passed');
    expect(report).toContain(
      'Note: 1 neutral evaluator comparison(s) in scope were skipped; neutral evaluators have no worse direction to check.'
    );
  });

  it('counts only in-scope neutral rows and omits the note when nothing was skipped', () => {
    const outOfScope = evaluateRegressionGate({
      results: [
        makeResult({ evaluatorName: 'Neutral', direction: 'neutral' }),
        makeResult({ evaluatorName: 'Correctness', sampleSize: 2 }),
      ],
      evaluators: ['Correctness'],
    });

    expect(outOfScope.status).toBe('inconclusive');
    expect(outOfScope.neutralSkipped).toBe(0);
    expect(formatRegressionGateReport({ decision: outOfScope })).not.toContain('Note:');
  });

  it('counts checked rows and reports passed only when something was actually tested', () => {
    const decision = evaluateRegressionGate({
      results: [
        makeResult({ evaluatorName: 'Fine', pValue: 0.5 }),
        makeResult({ evaluatorName: 'Skipped', sampleSize: 2 }),
        makeResult({ evaluatorName: 'NoP', pValue: null }),
      ],
    });

    expect(decision.status).toBe('passed');
    expect(decision.checked).toBe(1);
    const report = formatRegressionGateReport({ decision });
    expect(report).toContain('Regression gate passed');
    expect(decision.inScope).toBe(3);
    expect(report).toContain('1 of 3 evaluator comparison(s) checked');
    expect(report).toContain('NoP: no usable p-value');
    expect(report).toContain('Skipped: insufficient pairs');
  });

  it('is inconclusive when Holm puts significance out of reach for every row', () => {
    // 40 comparisons of 10 pairs: the Wilcoxon floor 2/2^10 times 40 is above 0.05, so even
    // rows where every pair got worse cannot be significant.
    const results = Array.from({ length: 40 }, (_, i) =>
      makeResult({ evaluatorName: `E${i}`, sampleSize: 10, pValue: 2 / 2 ** 10 })
    );

    const decision = evaluateRegressionGate({ results: applyHolmCorrection(results) });

    expect(decision.status).toBe('inconclusive');
    expect(decision.checked).toBe(0);
    expect(decision.inScope).toBe(40);
    expect(decision.underpowered).toHaveLength(40);
    expect(decision.underpowered[0]).toEqual({
      datasetName: 'Dataset One',
      evaluatorName: 'E0',
      sampleSize: 10,
      bestReachablePValue: expect.closeTo(0.078125, 10),
    });
    expect(formatRegressionGateReport({ decision })).toContain(
      '40 evaluator(s) could not reach p < 0.05 even if every pair got worse'
    );

    // The same rows without a correction can reach significance, and do.
    expect(evaluateRegressionGate({ results }).status).toBe('tripped');
  });

  it('checks rows that could reach significance and reports the rest as underpowered', () => {
    const results = applyHolmCorrection([
      ...Array.from({ length: 39 }, (_, i) =>
        makeResult({ evaluatorName: `E${i}`, sampleSize: 30, pValue: 0.5 })
      ),
      makeResult({ evaluatorName: 'Small', sampleSize: 10, pValue: 0.5 }),
    ]);

    const decision = evaluateRegressionGate({ results });

    expect(decision.status).toBe('passed');
    expect(decision.checked).toBe(39);
    expect(decision.underpowered.map(({ evaluatorName }) => evaluatorName)).toEqual(['Small']);
    const report = formatRegressionGateReport({ decision });
    expect(report).toContain('39 of 40 evaluator comparison(s) checked');
    expect(report).toContain('Dataset One / Small: underpowered (n=10, best reachable p=0.078)');
  });

  it('never calls a significant row underpowered', () => {
    const decision = evaluateRegressionGate({
      results: [makeResult({ sampleSize: 10, pValue: 0.002 })],
    });

    expect(decision.underpowered).toEqual([]);
    expect(decision.status).toBe('tripped');
  });

  it('reports a tripped status alongside untestable rows', () => {
    const decision = evaluateRegressionGate({
      results: [makeResult(), makeResult({ evaluatorName: 'NoP', pValue: null })],
    });

    expect(decision.status).toBe('tripped');
    expect(decision.checked).toBe(1);
    expect(decision.untestable).toHaveLength(1);
  });
});

describe('formatRegressionGateReport', () => {
  it('lists each regression with delta, p-values, test and pair count', () => {
    const decision = evaluateRegressionGate({
      results: applyHolmCorrection([makeResult({ pValue: 0.004 })]),
    });

    expect(formatRegressionGateReport({ decision })).toBe(
      [
        'Regression gate tripped: 1 evaluator(s) got significantly worse (p < 0.05).',
        '  - Dataset One / Correctness: delta -0.200, p=0.004, adjusted p=0.004, Wilcoxon, n=20 pairs',
      ].join('\n')
    );
  });

  it('prints a lower-is-better regression with a signed positive delta', () => {
    const decision = evaluateRegressionGate({
      results: [
        makeResult({
          evaluatorName: 'Latency',
          direction: 'minimize',
          meanTarget: 5,
          meanBaseline: 3,
          pValue: 0.0004,
        }),
      ],
    });

    expect(formatRegressionGateReport({ decision })).toContain(
      '  - Dataset One / Latency: delta +2.000, p=<0.001, Wilcoxon, n=20 pairs'
    );
  });

  it('warns about unchecked evaluators instead of claiming a clean pass for them', () => {
    const decision = evaluateRegressionGate({
      results: [makeResult({ sampleSize: 3 }), makeResult({ evaluatorName: 'Fine', pValue: 0.5 })],
    });

    const report = formatRegressionGateReport({ decision, minPairs: 10 });

    expect(report).toContain('Regression gate passed');
    expect(report).toContain('fewer than 10 pairs and were NOT checked');
    expect(report).toContain('Dataset One / Correctness: insufficient pairs (n=3)');
  });

  it('lists significant rows whose test and mean disagree, and still passes on the rest', () => {
    const decision = evaluateRegressionGate({
      results: [
        { ...makeResult({ evaluatorName: 'Conflicted', pValue: 0.002 }), effectSign: 1 },
        makeResult({ evaluatorName: 'Fine', pValue: 0.5 }),
      ],
    });

    expect(decision.status).toBe('passed');
    expect(decision.checked).toBe(1);
    const report = formatRegressionGateReport({ decision });
    expect(report).toContain(
      '1 evaluator(s) changed significantly, but the rank test and the mean'
    );
    expect(report).toContain(
      '  - Dataset One / Conflicted: mean delta -0.200, p=0.002, n=20 pairs'
    );
  });

  it('checks a non-significant row normally even when its test and mean disagree', () => {
    const decision = evaluateRegressionGate({
      results: [{ ...makeResult({ pValue: 0.4 }), effectSign: 1 }],
    });

    expect(decision.status).toBe('passed');
    expect(decision.directionConflicts).toEqual([]);
  });
});
