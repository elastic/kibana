/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { judgeAgreementForModel, type JudgeVerdict } from './judge_agreement';

const verdict = (
  judgeId: string,
  example: string,
  repetition: number,
  evaluator: string,
  score: number,
  modelId = 'model-a'
): JudgeVerdict => ({ modelId, judgeId, example, repetition, evaluator, score });

describe('judgeAgreementForModel', () => {
  it('reports unmeasured when the model has no verdicts', () => {
    expect(judgeAgreementForModel([], 'model-a')).toMatchObject({
      status: 'unmeasured',
      pairs: 0,
    });
  });

  it('reports single-judge rather than 100% when only one judge scored', () => {
    const verdicts = [
      verdict('gemini', 'ex-1', 0, 'Relevance', 1),
      verdict('gemini', 'ex-2', 0, 'Relevance', 1),
    ];
    const row = judgeAgreementForModel(verdicts, 'model-a');
    expect(row.status).toBe('single-judge');
    expect(row.verdictAgreement).toBeUndefined();
    expect(row.interval).toBeUndefined();
  });

  it('reports single-judge when two judges scored disjoint work', () => {
    const verdicts = [
      verdict('gemini', 'ex-1', 0, 'Relevance', 1),
      verdict('sonnet', 'ex-2', 0, 'Relevance', 1),
    ];
    const row = judgeAgreementForModel(verdicts, 'model-a');
    expect(row.status).toBe('single-judge');
    expect(row.pairs).toBe(0);
  });

  it('pairs only identical example+rep+evaluator cells', () => {
    const verdicts = [
      verdict('gemini', 'ex-1', 0, 'Relevance', 1),
      verdict('sonnet', 'ex-1', 0, 'Relevance', 1),
      // same example, different repetition -> not a pair
      verdict('sonnet', 'ex-1', 1, 'Relevance', 0),
      // same example+rep, different evaluator -> not a pair
      verdict('sonnet', 'ex-1', 0, 'Factuality', 0),
    ];
    const row = judgeAgreementForModel(verdicts, 'model-a');
    expect(row.pairs).toBe(1);
    expect(row.verdictAgreement).toBe(1);
  });

  it('does not pair the same example id reused across different suites', () => {
    // Regression: cells were keyed only by (example, repetition, evaluator), so two suites
    // reusing an example id fabricated agreement pairs that never existed.
    const verdicts = [
      { ...verdict('gemini', 'ex-1', 0, 'Relevance', 1), suiteId: 'suite-a' },
      { ...verdict('sonnet', 'ex-1', 0, 'Relevance', 0), suiteId: 'suite-b' },
    ];
    const row = judgeAgreementForModel(verdicts, 'model-a');
    expect(row.pairs).toBe(0);
  });

  it('still pairs matching cells that carry the same suite id', () => {
    const verdicts = [
      { ...verdict('gemini', 'ex-1', 0, 'Relevance', 1), suiteId: 'suite-a' },
      { ...verdict('sonnet', 'ex-1', 0, 'Relevance', 1), suiteId: 'suite-a' },
    ];
    const row = judgeAgreementForModel(verdicts, 'model-a');
    expect(row.pairs).toBe(1);
    expect(row.verdictAgreement).toBe(1);
  });

  it('reports how many cells only one judge scored', () => {
    const verdicts = [
      verdict('gemini', 'ex-1', 0, 'Relevance', 1),
      verdict('sonnet', 'ex-1', 0, 'Relevance', 1),
      verdict('sonnet', 'ex-2', 0, 'Relevance', 1),
      verdict('sonnet', 'ex-3', 0, 'Relevance', 0),
    ];
    const row = judgeAgreementForModel(verdicts, 'model-a');
    expect(row.pairs).toBe(1);
    expect(row.unpaired).toBe(2);
  });

  it('reports no unpaired cells when both judges scored identical work', () => {
    const verdicts = [
      verdict('gemini', 'ex-1', 0, 'Relevance', 1),
      verdict('sonnet', 'ex-1', 0, 'Relevance', 1),
      verdict('gemini', 'ex-2', 0, 'Relevance', 0),
      verdict('sonnet', 'ex-2', 0, 'Relevance', 0),
    ];
    const row = judgeAgreementForModel(verdicts, 'model-a');
    expect(row.pairs).toBe(2);
    expect(row.unpaired).toBe(0);
  });

  it('counts a pass/fail flip across the 0.5 midpoint', () => {
    const verdicts = [
      verdict('gemini', 'ex-1', 0, 'Relevance', 0.9),
      verdict('sonnet', 'ex-1', 0, 'Relevance', 0.1),
      verdict('gemini', 'ex-2', 0, 'Relevance', 0.9),
      verdict('sonnet', 'ex-2', 0, 'Relevance', 0.8),
    ];
    const row = judgeAgreementForModel(verdicts, 'model-a');
    expect(row.pairs).toBe(2);
    expect(row.verdictAgreement).toBe(0.5);
    expect(row.worstEvaluators[0]).toMatchObject({
      evaluator: 'Relevance',
      flips: 1,
      pairs: 2,
    });
  });

  it('treats differing scores on the same side of the midpoint as agreement', () => {
    const verdicts = [
      verdict('gemini', 'ex-1', 0, 'Relevance', 0.6),
      verdict('sonnet', 'ex-1', 0, 'Relevance', 1),
    ];
    const row = judgeAgreementForModel(verdicts, 'model-a');
    expect(row.verdictAgreement).toBe(1);
    expect(row.worstEvaluators).toHaveLength(0);
  });

  it('excludes cost and latency instruments from verdict agreement', () => {
    const verdicts = [
      verdict('gemini', 'ex-1', 0, 'Input Tokens', 1),
      verdict('sonnet', 'ex-1', 0, 'Input Tokens', 0),
      verdict('gemini', 'ex-1', 0, 'Latency', 1),
      verdict('sonnet', 'ex-1', 0, 'Latency', 0),
      verdict('gemini', 'ex-1', 0, 'Relevance', 1),
      verdict('sonnet', 'ex-1', 0, 'Relevance', 1),
    ];
    const row = judgeAgreementForModel(verdicts, 'model-a');
    expect(row.pairs).toBe(1);
    expect(row.verdictAgreement).toBe(1);
  });

  it('reports directional bias between the two judges', () => {
    const verdicts = [
      verdict('gemini', 'ex-1', 0, 'Relevance', 0.6),
      verdict('sonnet', 'ex-1', 0, 'Relevance', 1),
    ];
    const row = judgeAgreementForModel(verdicts, 'model-a');
    expect(row.biasJudges).toEqual(['gemini', 'sonnet']);
    expect(row.bias).toBeCloseTo(-0.4, 5);
  });

  it('carries a Wilson interval that widens at small n', () => {
    const few = judgeAgreementForModel(
      [verdict('gemini', 'ex-1', 0, 'Relevance', 1), verdict('sonnet', 'ex-1', 0, 'Relevance', 1)],
      'model-a'
    );
    const many = judgeAgreementForModel(
      Array.from({ length: 50 }, (_, i) => [
        verdict('gemini', `ex-${i}`, 0, 'Relevance', 1),
        verdict('sonnet', `ex-${i}`, 0, 'Relevance', 1),
      ]).flat(),
      'model-a'
    );
    expect(few.verdictAgreement).toBe(1);
    expect(many.verdictAgreement).toBe(1);
    expect(few.interval!.low).toBeLessThan(many.interval!.low);
  });

  it('ignores verdicts belonging to other models', () => {
    const verdicts = [
      verdict('gemini', 'ex-1', 0, 'Relevance', 1),
      verdict('sonnet', 'ex-1', 0, 'Relevance', 0),
      verdict('gemini', 'ex-1', 0, 'Relevance', 1, 'model-b'),
      verdict('sonnet', 'ex-1', 0, 'Relevance', 1, 'model-b'),
    ];
    expect(judgeAgreementForModel(verdicts, 'model-a').verdictAgreement).toBe(0);
    expect(judgeAgreementForModel(verdicts, 'model-b').verdictAgreement).toBe(1);
  });

  it('ranks the worst evaluators by flip rate, not raw count', () => {
    const verdicts = [
      // Relevance: 1 flip out of 1 -> 100%
      verdict('gemini', 'ex-1', 0, 'Relevance', 1),
      verdict('sonnet', 'ex-1', 0, 'Relevance', 0),
      // Factuality: 2 flips out of 10 -> 20%, higher raw count
      ...Array.from({ length: 10 }, (_, i) => [
        verdict('gemini', `f-${i}`, 0, 'Factuality', 1),
        verdict('sonnet', `f-${i}`, 0, 'Factuality', i < 2 ? 0 : 1),
      ]).flat(),
    ];
    const row = judgeAgreementForModel(verdicts, 'model-a');
    expect(row.worstEvaluators[0].evaluator).toBe('Relevance');
    expect(row.worstEvaluators[1].evaluator).toBe('Factuality');
  });
});

describe('round 6 regression: same-family judges are not paired', () => {
  it('reports single-judge when every overlapping judge pair shares a model family', () => {
    // Two Anthropic-family judges with identical cells: family self-consistency, not
    // an independent second opinion.
    const verdicts = [
      verdict('anthropic-claude-4.5-haiku', 'ex-1', 0, 'Relevance', 1),
      verdict('anthropic-claude-4.6-sonnet', 'ex-1', 0, 'Relevance', 1),
      verdict('anthropic-claude-4.5-haiku', 'ex-2', 0, 'Relevance', 1),
      verdict('anthropic-claude-4.6-sonnet', 'ex-2', 0, 'Relevance', 1),
    ];
    const row = judgeAgreementForModel(verdicts, 'model-a');
    expect(row.status).toBe('single-judge');
    expect(row.pairs).toBe(0);
  });

  it('prefers a cross-family pair even when a same-family pair overlaps more', () => {
    const verdicts = [
      verdict('anthropic-claude-4.5-haiku', 'ex-1', 0, 'Relevance', 1),
      verdict('anthropic-claude-4.6-sonnet', 'ex-1', 0, 'Relevance', 0),
      verdict('anthropic-claude-4.6-sonnet', 'ex-2', 0, 'Relevance', 0),
      verdict('anthropic-claude-4.6-sonnet', 'ex-3', 0, 'Relevance', 0),
      verdict('anthropic-claude-4.5-haiku', 'ex-2', 0, 'Relevance', 1),
      verdict('anthropic-claude-4.5-haiku', 'ex-3', 0, 'Relevance', 1),
      // cross-family overlap on one example only — must win over the 3-cell same-family pair
      verdict('gemini-2.5-pro', 'ex-1', 0, 'Relevance', 1),
    ];
    const row = judgeAgreementForModel(verdicts, 'model-a');
    expect(row.status).toBe('measured');
    expect(row.pairs).toBe(1);
    expect(row.biasJudges).toEqual(['gemini-2.5-pro', 'anthropic-claude-4.5-haiku'].sort());
  });
});
