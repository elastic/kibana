/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PairedScore } from '@kbn/evals-common';
import { applyHolmCorrection, attachEffectSigns, compareScores } from '@kbn/evals-common';
import { evaluateRegressionGate } from './regression_gate';

const makePairs = (
  scores: ReadonlyArray<[target: number, baseline: number]>,
  evaluatorName = 'Correctness'
): PairedScore[] =>
  scores.map(([scoreTarget, scoreBaseline]) => ({
    datasetId: 'ds-1',
    datasetName: 'Dataset One',
    evaluatorName,
    scoreTarget,
    scoreBaseline,
    direction: 'maximize',
  }));

const repeat = <T>(count: number, value: T): T[] => Array.from({ length: count }, () => value);

// Most pairs improve slightly while a few collapse: the mean drops, the ranks say "better".
const mostlyBetterFewCollapse = makePairs([
  ...repeat<[number, number]>(20, [0.53, 0.5]),
  ...repeat<[number, number]>(3, [0, 1]),
]);

const swapArms = (pairs: PairedScore[]): PairedScore[] =>
  pairs.map((pair) => ({
    ...pair,
    scoreTarget: pair.scoreBaseline,
    scoreBaseline: pair.scoreTarget,
  }));

const compare = (pairs: PairedScore[]) =>
  attachEffectSigns(applyHolmCorrection(compareScores(pairs)), pairs);

describe('evaluateRegressionGate on rows where the ranks and the mean disagree', () => {
  it('does not trip the gate on a drop in the mean the rank test does not support', () => {
    const decision = evaluateRegressionGate({ results: compare(mostlyBetterFewCollapse) });

    expect(decision.tripped).toBe(false);
    expect(decision.status).toBe('inconclusive');
    expect(decision.checked).toBe(0);
    expect(decision.directionConflicts).toEqual([
      expect.objectContaining({ evaluatorName: 'Correctness', sampleSize: 23 }),
    ]);
  });

  it('does not report a pass for the mirrored case, where the mean rises but most pairs got worse', () => {
    const [row] = compare(swapArms(mostlyBetterFewCollapse));
    expect(row.meanTarget - row.meanBaseline).toBeGreaterThan(0);
    expect(row.effectSign).toBe(-1);

    const decision = evaluateRegressionGate({ results: [row] });
    expect(decision.status).toBe('inconclusive');
    expect(decision.directionConflicts).toHaveLength(1);
  });

  it('still trips when the ranks and the mean agree on a drop', () => {
    const pairs = makePairs(
      Array.from({ length: 15 }, (_, i): [number, number] => [0.5 - 0.01 * (i + 1), 0.6])
    );
    const results = compare(pairs);
    expect(results[0].hypothesisTest.id).toBe('wilcoxon_signed_rank');

    const decision = evaluateRegressionGate({ results });
    expect(decision.status).toBe('tripped');
    expect(decision.directionConflicts).toEqual([]);
  });
});
