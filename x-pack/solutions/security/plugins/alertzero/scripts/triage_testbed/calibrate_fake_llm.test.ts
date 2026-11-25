/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Classification, ConfidenceDistribution, TruthRecord, Verdict } from './fake_llm';
import { DEFAULT_CONFIG, sampleConfidence } from './fake_llm';
import type { ModelCall, ModelVerdict, ShortVerdict } from './report_run';
import type { AnswerRow, FitCall } from './calibrate_fake_llm';
import {
  share,
  wilson,
  joinAnswers,
  fitVerdicts,
  fitDistribution,
  fitConfidence,
  fitLatency,
  fitTokens,
  truePositiveGap,
  contentAgreement,
  proposeConfig,
  calibrate,
} from './calibrate_fake_llm';

const row = (
  truthVerdict: string,
  answer: ShortVerdict,
  confidence: number = 0.9,
  extra: Partial<AnswerRow> = {}
): AnswerRow => ({
  id: `x${Math.random()}`,
  truth: truthVerdict,
  variant: null,
  benign: null,
  answer,
  confidence,
  ...extra,
});
const repeat = <T>(count: number, make: (i: number) => T): T[] =>
  Array.from({ length: count }, (_, i) => make(i));

// A value that the test expects to be there: reading a missing one fails the test.
const required = <T>(value: T | null | undefined): T => {
  if (value === null || value === undefined) throw new Error('expected a value');
  return value;
};
const quantilesOf = (distribution: ConfidenceDistribution | null): readonly number[] =>
  required(required(distribution).quantiles);

describe('wilson and share', () => {
  it('gives an interval around the share that widens when there are few observations', () => {
    const many = wilson(60, 1000);
    const few = wilson(6, 100);

    expect(many.low).toBeLessThan(0.06);
    expect(many.high).toBeGreaterThan(0.06);
    expect(required(few.high) - required(few.low)).toBeGreaterThan(
      required(many.high) - required(many.low)
    );
  });

  it('gives no value and no interval for no observations', () => {
    expect(share(0, 0)).toEqual({ value: null, count: 0, of: 0, low: null, high: null });
  });
});

describe('joinAnswers', () => {
  const truth = new Map<string, TruthRecord>([
    ['a', { verdict: 'false_positive', variant: null, benign: null }],
  ]);

  it('takes the raw answers of completed calls for alerts that are in the truth file', () => {
    const calls: Array<Pick<ModelCall, 'status' | 'verdicts'>> = [
      {
        status: 'completed',
        verdicts: [
          { id: 'a', classification: 'true_positive', confidence_score: 0.7 },
          { id: 'zzz', classification: 'false_positive', confidence_score: 0.9 },
        ],
      },
      {
        status: 'failed',
        verdicts: [{ id: 'a', classification: 'false_positive', confidence_score: 0.9 }],
      },
    ];

    expect(joinAnswers(calls, truth)).toEqual([
      { id: 'a', truth: 'fp', variant: null, benign: null, answer: 'tp', confidence: 0.7 },
    ]);
  });
});

describe('fitVerdicts', () => {
  const rows = [
    // 100 false positives: 6 got true positive, 4 got inconclusive (left out of the settled count)
    ...repeat(90, () => row('fp', 'fp')),
    ...repeat(6, () => row('fp', 'tp')),
    ...repeat(4, () => row('fp', 'inc', 0.5)),
    // 40 true positives: 8 got false positive
    ...repeat(32, () => row('tp', 'tp')),
    ...repeat(8, () => row('tp', 'fp')),
    // planted variants: 3 of 4 missed, one inconclusive
    ...repeat(3, () => row('tp', 'fp', 0.9, { variant: 'untrusted_signer' })),
    row('tp', 'tp', 0.9, { variant: 'untrusted_signer' }),
    row('tp', 'inc', 0.5, { variant: 'new_hash' }),
  ];
  const fit = fitVerdicts(rows);

  it('gives the two directions of wrong verdicts apart, from the settled answers only', () => {
    expect(fit.flipRate.falsePositiveAsTruePositive).toMatchObject({
      count: 6,
      of: 96,
      value: 0.0625,
    });
    expect(fit.flipRate.truePositiveAsFalsePositive).toMatchObject({
      count: 8,
      of: 40,
      value: 0.2,
    });
  });

  it('gives the inconclusive rate over all answers, and keeps planted variants out of the flip rates', () => {
    expect(fit.inconclusiveRate).toMatchObject({ count: 5, of: rows.length });
    expect(fit.flipRate.truePositiveAsFalsePositive.of).toBe(40); // not 44
  });

  it('gives the miss rate per variant type, with an inconclusive answer left out', () => {
    expect(fit.variantMissRate.untrusted_signer).toMatchObject({ count: 3, of: 4, value: 0.75 });
    expect(fit.variantMissRate.new_hash).toMatchObject({ count: 0, of: 0, value: null });
  });
});

describe('fitDistribution', () => {
  it('gives a table of 11 quantiles from the smallest to the largest value when there are enough answers', () => {
    const scores = repeat(100, (i) => 0.5 + i / 200); // 0.5 to 0.995
    const { distribution, count } = fitDistribution(scores);

    expect(count).toBe(100);
    const quantiles = quantilesOf(distribution);
    expect(quantiles).toHaveLength(11);
    expect(quantiles[0]).toBe(0.5);
    expect(quantiles[10]).toBeCloseTo(0.995, 2);
    expect([...quantiles].sort((a, b) => a - b)).toEqual(quantiles);
  });

  it('gives a mean and a half width, and says that the sample is small, when there are fewer than 20 answers', () => {
    const result = fitDistribution([0.7, 0.8, 0.75, 0.85, 0.65]);

    const distribution = required(result.distribution);
    expect(result.lowSample).toBe(true);
    expect(distribution.mean).toBeCloseTo(0.75, 2);
    expect(distribution.halfWidth).toBeGreaterThan(0.05);
    expect(distribution.quantiles).toBeUndefined();
  });

  it('gives nothing for no answers, so that the previous setting is kept', () => {
    expect(fitDistribution([])).toEqual({ distribution: null, count: 0 });
  });

  it('can be sampled by the fake and gives back the mean of the real answers', () => {
    // a skewed set: most answers close to 0.95, a tail down to 0.6
    const scores = repeat(400, (i) => 0.95 - 0.35 * (1 - i / 399) ** 3);
    const { distribution } = fitDistribution(scores);
    const sampled = repeat(20000, (i) => sampleConfidence(required(distribution), i / 20000));
    const realMean = scores.reduce((a, b) => a + b, 0) / scores.length;
    const sampledMean = sampled.reduce((a, b) => a + b, 0) / sampled.length;

    expect(Math.abs(sampledMean - realMean)).toBeLessThan(0.01);
  });
});

describe('fitConfidence', () => {
  it('keeps right, wrong and inconclusive answers apart, and leaves planted variants out', () => {
    const rows = [
      ...repeat(30, () => row('fp', 'fp', 0.93)),
      ...repeat(25, () => row('tp', 'fp', 0.7)),
      ...repeat(3, () => row('fp', 'inc', 0.45)),
      row('tp', 'fp', 0.99, { variant: 'new_hash' }),
    ];
    const fit = fitConfidence(rows);

    expect(fit.correct.count).toBe(30);
    expect(fit.wrong.count).toBe(25); // the variant is not counted
    expect(fit.inconclusive.count).toBe(3);
    expect(quantilesOf(fit.correct.distribution)[5]).toBeCloseTo(0.93, 2);
    expect(quantilesOf(fit.wrong.distribution)[5]).toBeCloseTo(0.7, 2);
  });
});

describe('fitLatency', () => {
  const call = (alerts: number, ms: number): FitCall => ({
    status: 'completed',
    executionTimeMs: ms,
    prompt: Array.from({ length: alerts }, (_, i) => `<alert id="id${i}">x</alert>`).join('\n'),
  });

  it('recovers a base time and a time per alert from calls of different sizes', () => {
    const fit = fitLatency([call(10, 3500), call(20, 5000), call(40, 8000), call(80, 14000)]);

    expect(fit).toMatchObject({ baseMs: 2000, perAlertMs: 150, calls: 4 });
    expect(required(fit).sigma).toBeCloseTo(0, 2);
  });

  it('puts all the time on the alerts when every call has the same size, because no base can be told', () => {
    const fit = fitLatency([call(20, 5000), call(20, 5200), call(20, 4800)]);

    expect(fit).toMatchObject({ baseMs: 0, perAlertMs: 250 });
  });

  it('measures the spread of the calls around the line', () => {
    const fit = fitLatency([call(10, 3500), call(10, 7000), call(10, 1750), call(10, 3500)]);

    expect(required(fit).sigma).toBeGreaterThan(0.3);
  });

  it('ignores failed calls and gives null for no calls', () => {
    expect(fitLatency([{ status: 'failed', executionTimeMs: 9, prompt: '' }])).toBeNull();
  });
});

describe('fitTokens', () => {
  it('gives the characters per token of the prompt and the tokens per alert', () => {
    const prompt = `${'x'.repeat(400)}<alert id="a">x</alert><alert id="b">x</alert>`;
    const calls: FitCall[] = [{ status: 'completed', prompt, inputTokens: 100, outputTokens: 60 }];
    const fit = fitTokens(calls);

    expect(required(fit).charsPerToken).toBeCloseTo(prompt.length / 100, 1);
    expect(required(fit).completionPerAlert).toBe(30);
    expect(required(fit).promptTokensPerAlert).toBe(50);
  });
});

describe('truePositiveGap', () => {
  it('tells a biased sample from a model that finds too few attacks', () => {
    // The whole truth has 20% true positives. The analyzed alerts have 10% true positives (a sample that took mostly benign rules)
    // and the model gives true positive to 12% of them.
    const truth = new Map<string, TruthRecord>(
      repeat<[string, TruthRecord]>(1000, (i) => [
        `t${i}`,
        { verdict: i < 200 ? 'true_positive' : 'false_positive' },
      ])
    );
    const rows = [
      ...repeat(5, () => row('tp', 'tp')),
      ...repeat(5, () => row('tp', 'fp')),
      ...repeat(7, () => row('fp', 'tp')),
      ...repeat(83, () => row('fp', 'fp')),
    ];
    const gap = truePositiveGap(rows, truth);

    expect(gap.analyzed).toBe(100);
    expect(gap.truePositivesInTheAnalyzedAlerts.value).toBe(0.1);
    expect(gap.modelTruePositiveVerdicts.value).toBe(0.12);
    expect(gap.truePositivesInTheWholeTruth.value).toBe(0.2);
    expect(gap.gapModelToSample).toBeCloseTo(0.02, 5);
    expect(gap.gapSampleToWholeTruth).toBeCloseTo(-0.1, 5);
  });
});

describe('proposeConfig and calibrate', () => {
  const truth = new Map<string, TruthRecord>();
  const calls: FitCall[] = [];
  // 60 false positives and 20 true positives, in calls of 20 alerts. The model flips 6 false positives and 4 true positives.
  const verdicts: ModelVerdict[] = [];
  repeat(60, (i) => {
    truth.set(`f${i}`, { verdict: 'false_positive', variant: null, benign: null });
    verdicts.push({
      id: `f${i}`,
      classification: i < 6 ? 'true_positive' : 'false_positive',
      confidence_score: i < 6 ? 0.7 : 0.92,
    });
  });
  repeat(20, (i) => {
    truth.set(`t${i}`, { verdict: 'true_positive', variant: null, benign: null });
    verdicts.push({
      id: `t${i}`,
      classification: i < 4 ? 'false_positive' : 'true_positive',
      confidence_score: i < 4 ? 0.72 : 0.96,
    });
  });
  repeat(4, (b) => {
    const slice = verdicts.slice(b * 20, b * 20 + 20);
    calls.push({
      status: 'completed',
      executionTimeMs: 5000 + b * 10,
      prompt: slice.map(({ id }) => `<alert id="${id}">x</alert>`).join('\n'),
      verdicts: slice,
      inputTokens: 2000,
      outputTokens: 1000,
    });
  });
  const result = calibrate({ calls, truth, previous: DEFAULT_CONFIG });

  it('proposes the observed directions, confidence tables, latency and tokens', () => {
    const { proposedConfig: config } = result;

    expect(config.flipRate.falsePositiveAsTruePositive).toBe(0.1);
    expect(config.flipRate.truePositiveAsFalsePositive).toBe(0.2);
    expect(config.inconclusiveRate).toBe(0); // no inconclusive answer was seen
    expect(config.tokens.completionPerAlert).toBe(50);
    expect(config.latency.perAlertMs).toBeGreaterThan(200);
  });

  it('keeps the previous setting for a variant type that the run did not contain', () => {
    expect(result.proposedConfig.variantMissRate).toEqual(DEFAULT_CONFIG.variantMissRate);
  });

  it('keeps the previous distribution when there is no observation behind a new one', () => {
    const none = proposeConfig({
      verdicts: fitVerdicts([]),
      confidence: fitConfidence([]),
      latency: null,
      tokens: null,
      previous: DEFAULT_CONFIG,
    });

    expect(none.confidence.correct).toEqual(DEFAULT_CONFIG.confidence.correct);
    expect(none.flipRate).toEqual(DEFAULT_CONFIG.flipRate);
    expect(none.latency).toEqual(DEFAULT_CONFIG.latency);
  });

  it('reports the gap between the true positives of the model and of the sample', () => {
    const gap = required(result.truePositiveGap);
    expect(gap.truePositivesInTheAnalyzedAlerts.value).toBe(0.25);
    // 6 false positives got true positive and 16 true positives got it right: 22 of 80
    expect(gap.modelTruePositiveVerdicts.value).toBe(0.275);
    expect(gap.gapModelToSample).toBeCloseTo(0.025, 5);
  });
});

describe('contentAgreement', () => {
  it('tells for each kind and truth how often the model gave the true answer, the opposite or inconclusive', () => {
    const rows = [
      ...repeat(8, () => row('fp', 'fp', 0.9, { kind: 'process' })),
      row('fp', 'tp', 0.7, { kind: 'process' }),
      row('fp', 'inc', 0.5, { kind: 'process' }),
      ...repeat(2, () => row('tp', 'fp', 0.8, { kind: 'cloud' })),
      row('tp', 'tp', 0.9, { kind: 'cloud' }),
    ];
    const { byKindAndTruth } = contentAgreement(rows);

    expect(byKindAndTruth['process / false positive']).toEqual({
      n: 10,
      right: 8,
      opposite: 1,
      inconclusive: 1,
      rightShare: 0.8,
      oppositeShare: 0.1,
    });
    // A kind where the model is mostly wrong is a kind whose content does not carry the truth.
    expect(byKindAndTruth['cloud / true positive']).toMatchObject({ n: 3, right: 1, opposite: 2 });
  });

  it('tells how often the model found each planted variant, and took a harmless change for a true positive', () => {
    const rows = [
      row('tp', 'tp', 0.9, { kind: 'process', variant: 'encoded_command_line' }),
      row('tp', 'tp', 0.9, { kind: 'process', variant: 'encoded_command_line' }),
      row('tp', 'fp', 0.9, { kind: 'process', variant: 'new_hash' }),
      row('fp', 'tp', 0.7, { kind: 'process', benign: 'hash_update' }),
      row('fp', 'fp', 0.9, { kind: 'process', benign: 'hash_update' }),
    ];
    const result = contentAgreement(rows);

    expect(result.plantedVariants.encoded_command_line).toEqual({
      n: 2,
      foundAsTruePositive: 2,
      foundShare: 1,
    });
    expect(result.plantedVariants.new_hash.foundShare).toBe(0);
    expect(result.harmlessChanges).toEqual({ n: 2, takenForTruePositive: 1 });
  });
});

describe('calibrate with an excluded rule', () => {
  const truth = new Map<string, TruthRecord>();
  const verdicts: ModelVerdict[] = [];
  // 40 true positives of a good rule (4 of them wrongly called false positive) and 20 of an excluded rule that the model reads as benign.
  const add = (
    id: string,
    truthVerdict: Verdict,
    answer: Classification,
    ruleUuid: string,
    confidence: number
  ): void => {
    truth.set(id, {
      verdict: truthVerdict,
      variant: null,
      benign: null,
      kind: 'aggregate',
      ruleUuid,
    });
    verdicts.push({ id, classification: answer, confidence_score: confidence });
  };
  repeat(40, (i) =>
    add(
      `g${i}`,
      'true_positive',
      i < 4 ? 'false_positive' : 'true_positive',
      'good',
      i < 4 ? 0.5 : 0.95
    )
  );
  repeat(20, (i) => add(`x${i}`, 'true_positive', 'false_positive', 'excluded', 0.85));
  repeat(30, (i) => add(`f${i}`, 'false_positive', 'false_positive', 'good', 0.9));
  const calls: FitCall[] = [
    {
      status: 'completed',
      executionTimeMs: 5000,
      prompt: verdicts.map(({ id }) => `<alert id="${id}">x</alert>`).join('\n'),
      verdicts,
      inputTokens: 5000,
      outputTokens: 1000,
    },
  ];

  it('leaves the answers of the excluded rule out of the flip rate and the confidence of wrong answers', () => {
    const withAll = calibrate({ calls, truth, previous: DEFAULT_CONFIG });
    const without = calibrate({
      calls,
      truth,
      previous: DEFAULT_CONFIG,
      excludeRules: new Set(['excluded']),
    });

    // All 60 true positives: 24 called false positive (4 of the good rule, 20 of the excluded one). Without the excluded rule: 4 of 40.
    expect(withAll.verdicts.flipRate.truePositiveAsFalsePositive).toMatchObject({
      count: 24,
      of: 60,
    });
    expect(without.verdicts.flipRate.truePositiveAsFalsePositive).toMatchObject({
      count: 4,
      of: 40,
    });
    expect(without.answersInTheFit).toBe(70);
    expect(without.answers).toBe(90);
  });

  it('reports the excluded rule apart and keeps it in the content agreement, so that the exclusion cannot hide it', () => {
    const without = calibrate({
      calls,
      truth,
      previous: DEFAULT_CONFIG,
      excludeRules: new Set(['excluded']),
    });

    expect(without.excludedRules).toEqual({
      excluded: { answers: 20, truthToAnswer: { 'tp>fp': 20 } },
    });
    expect(without.contentAgreement.byKindAndTruth['aggregate / true positive']).toMatchObject({
      n: 60,
      opposite: 24,
    });
  });
});
