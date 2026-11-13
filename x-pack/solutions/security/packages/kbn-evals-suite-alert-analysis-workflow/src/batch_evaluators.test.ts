/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Classification } from './constants';
import { batchEvaluators, type BatchExpected, type BatchOutput } from './batch_evaluators';

const run = async (name: string, output: BatchOutput, expected: BatchExpected) => {
  const evaluator = batchEvaluators.find((e) => e.name === name);
  if (!evaluator) {
    throw new Error(`No evaluator ${name}`);
  }
  return evaluator.evaluate({ output, expected, input: {}, metadata: {} } as never);
};

const build = (
  rows: Array<[expected: Classification, predicted: Classification | undefined, shape: string]>
): { output: BatchOutput; expected: BatchExpected } => ({
  output: {
    predictions: rows.map(([, classification]) => ({ classification })),
    executionStatus: 'completed',
  },
  expected: {
    labels: rows.map(([label]) => label),
    shapes: rows.map(([, , shape]) => shape),
    hard: rows.map(() => false),
  },
});

describe('MaliciousNotClosed', () => {
  it('names the true positives marked false_positive and keeps the score', async () => {
    const { output, expected } = build([
      ['true_positive', 'true_positive', 'mal-a'],
      ['false_positive', 'false_positive', 'benign-a'],
      ['true_positive', 'false_positive', 'mal-b'],
      ['true_positive', 'true_positive', 'mal-a'],
    ]);

    const result = await run('MaliciousNotClosed', output, expected);

    expect(result.score).toBeCloseTo(1 - 1 / 3);
    expect(result.explanation).toBe('1/3 true positives marked false_positive: mal-b#2');
  });

  it('reports a missing verdict apart from a closed one, without scoring it as closed', async () => {
    const { output, expected } = build([
      ['true_positive', undefined, 'mal-a'],
      ['true_positive', 'false_positive', 'mal-b'],
    ]);

    const result = await run('MaliciousNotClosed', output, expected);

    expect(result.score).toBe(0.5);
    expect(result.explanation).toBe(
      '1/2 true positives marked false_positive: mal-b#1; no verdict: mal-a#0'
    );
  });

  it('lists at most 10 alerts and counts the rest', async () => {
    const { output, expected } = build(
      Array.from({ length: 13 }, (_, i): [Classification, Classification, string] => [
        'true_positive',
        'false_positive',
        'mal-a',
      ])
    );

    const result = await run('MaliciousNotClosed', output, expected);

    expect(result.score).toBe(0);
    expect(result.explanation).toContain('13/13 true positives marked false_positive: ');
    expect(result.explanation).toContain('mal-a#9, +3 more');
    expect(result.explanation).not.toContain('mal-a#10');
  });

  it('names nothing when every true positive is escalated', async () => {
    const { output, expected } = build([
      ['true_positive', 'true_positive', 'mal-a'],
      ['false_positive', 'true_positive', 'benign-a'],
    ]);

    const result = await run('MaliciousNotClosed', output, expected);

    expect(result.score).toBe(1);
    expect(result.explanation).toBe('0/1 true positives marked false_positive');
  });

  it('scores null when the batch has no true positives', async () => {
    const { output, expected } = build([['false_positive', 'false_positive', 'benign-a']]);

    expect((await run('MaliciousNotClosed', output, expected)).score).toBeNull();
  });
});

describe('BenignNotEscalated', () => {
  it('names the false positives marked true_positive and keeps the score', async () => {
    const { output, expected } = build([
      ['false_positive', 'true_positive', 'benign-a'],
      ['false_positive', 'false_positive', 'benign-b'],
      ['true_positive', 'true_positive', 'mal-a'],
      ['false_positive', 'true_positive', 'benign-b'],
    ]);

    const result = await run('BenignNotEscalated', output, expected);

    expect(result.score).toBeCloseTo(1 / 3);
    expect(result.explanation).toBe(
      '2/3 false positives marked true_positive: benign-a#0, benign-b#3'
    );
  });

  it('keeps the plain explanation when nothing was escalated or dropped', async () => {
    const { output, expected } = build([
      ['false_positive', 'false_positive', 'benign-a'],
      ['false_positive', 'false_positive', 'benign-b'],
    ]);

    const result = await run('BenignNotEscalated', output, expected);

    expect(result.score).toBe(1);
    expect(result.explanation).toBe('0/2 false positives marked true_positive');
  });

  it('reports a missing verdict apart from an escalated one, without scoring it as escalated', async () => {
    const { output, expected } = build([
      ['false_positive', undefined, 'benign-a'],
      ['false_positive', 'true_positive', 'benign-b'],
    ]);

    const result = await run('BenignNotEscalated', output, expected);

    expect(result.score).toBe(0.5);
    expect(result.explanation).toBe(
      '1/2 false positives marked true_positive: benign-b#1; no verdict: benign-a#0'
    );
  });
});
