/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loggingSystemMock } from '@kbn/core/server/mocks';
import type { BoundInferenceClient } from '@kbn/inference-common';
import type { EvidenceRound } from '@kbn/evals-plugin/server';
import { MAX_EXPLANATION_LENGTH } from '../run_judge';
import type { RcaRewardOutput } from './prompt';
import { extractMaxConfidence, rcaRewardJudge, temporalProximityScore } from '.';

const round: EvidenceRound = {
  input: { message: 'Investigate the checkout latency alert' },
  steps: [{ tool_id: 'platform.core.search', arguments: { q: 'checkout' }, result: { hits: 3 } }],
  response: { message: 'The 14:02 deploy of checkout caused the latency (85% confidence).' },
};

const judgeOutput = (overrides: Partial<RcaRewardOutput> = {}): RcaRewardOutput => ({
  investigation_produced_evidence: true,
  investigation_reasoning: 'Retrieved checkout logs and deploy events.',
  timeline_contradiction_found: false,
  timeline_reasoning: 'The deploy preceded the latency increase.',
  used_post_incident_evidence: false,
  anti_leakage_reasoning: 'No post-incident notes were used.',
  confidence_overconfident: false,
  root_cause_timestamp_minutes_before_onset: 4,
  temporal_proximity_reasoning: 'The deploy landed four minutes before the alert fired.',
  ...overrides,
});

const createInferenceClient = (...outputs: unknown[]) => {
  const prompt = jest.fn();
  for (const output of outputs) {
    prompt.mockResolvedValueOnce({ toolCalls: [{ function: { arguments: output } }] });
  }
  return { prompt, inferenceClient: { prompt } as unknown as BoundInferenceClient };
};

const evaluate = (inferenceClient: BoundInferenceClient, evidence: EvidenceRound = round) =>
  rcaRewardJudge.evaluate({
    round: evidence,
    inferenceClient,
    log: loggingSystemMock.createLogger(),
  });

describe('nightshift_rca_reward', () => {
  it('sends the rendered round in one prompt and returns every dimension', async () => {
    const { prompt, inferenceClient } = createInferenceClient(judgeOutput());

    const { scores } = await evaluate(inferenceClient);

    expect(prompt).toHaveBeenCalledTimes(1);
    const { input, toolChoice } = prompt.mock.calls[0][0];
    expect(toolChoice).toEqual({ function: 'score_investigation' });
    expect(input.transcript).toContain('## User\nInvestigate the checkout latency alert');
    expect(input.transcript).toContain('## Tool call 1: platform.core.search');
    expect(input.transcript).toContain('## Agent final answer\nThe 14:02 deploy');
    expect(scores).toEqual([
      {
        name: 'rca_investigation_complete',
        score: 1,
        explanation: 'Retrieved checkout logs and deploy events.',
      },
      {
        name: 'rca_temporal_proximity',
        score: 1,
        label: 'gap=4min',
        explanation: 'The deploy landed four minutes before the alert fired.',
      },
      {
        name: 'rca_timeline_ok',
        score: 1,
        explanation: 'The deploy preceded the latency increase.',
      },
      { name: 'rca_anti_leakage', score: 1, explanation: 'No post-incident notes were used.' },
      { name: 'rca_confidence_ok', score: 1, label: 'stated_confidence=85%' },
    ]);
  });

  it('scores contradictions, leakage and overconfidence as 0', async () => {
    const { inferenceClient } = createInferenceClient(
      judgeOutput({
        timeline_contradiction_found: true,
        used_post_incident_evidence: true,
        confidence_overconfident: true,
      })
    );

    const { scores } = await evaluate(inferenceClient);

    const byName = Object.fromEntries(scores.map(({ name, score }) => [name, score]));
    expect(byName).toMatchObject({
      rca_timeline_ok: 0,
      rca_anti_leakage: 0,
      rca_confidence_ok: 0,
    });
  });

  it('drops the timeline and leakage scores when the investigation produced no evidence', async () => {
    const { inferenceClient } = createInferenceClient(
      judgeOutput({ investigation_produced_evidence: false })
    );

    const { scores } = await evaluate(inferenceClient);

    const names = scores.map(({ name }) => name);
    expect(names).toContain('rca_investigation_complete');
    expect(names).not.toContain('rca_timeline_ok');
    expect(names).not.toContain('rca_anti_leakage');
    expect(scores.find(({ name }) => name === 'rca_investigation_complete')?.score).toBe(0);
  });

  it('scores temporal proximity as 0 with a no_timestamps label when no gap was found', async () => {
    const { inferenceClient } = createInferenceClient(
      judgeOutput({ root_cause_timestamp_minutes_before_onset: undefined })
    );

    const { scores } = await evaluate(inferenceClient);

    expect(scores.find(({ name }) => name === 'rca_temporal_proximity')).toEqual({
      name: 'rca_temporal_proximity',
      score: 0,
      label: 'no_timestamps',
      explanation: 'The deploy landed four minutes before the alert fired.',
    });
  });

  it('scores temporal proximity as 0 with a cause_after_onset label when the gap is negative', async () => {
    const { inferenceClient } = createInferenceClient(
      judgeOutput({
        root_cause_timestamp_minutes_before_onset: -3,
        temporal_proximity_reasoning: 'The deploy happened three minutes after the alert fired.',
      })
    );

    const { scores } = await evaluate(inferenceClient);

    expect(scores.find(({ name }) => name === 'rca_temporal_proximity')).toEqual({
      name: 'rca_temporal_proximity',
      score: 0,
      label: 'cause_after_onset',
      explanation: 'The deploy happened three minutes after the alert fired.',
    });
  });

  it('drops the confidence score when the answer states no confidence', async () => {
    const { inferenceClient } = createInferenceClient(judgeOutput());

    const { scores } = await evaluate(inferenceClient, {
      ...round,
      response: { message: 'The 14:02 deploy of checkout caused the latency.' },
    });

    expect(scores.map(({ name }) => name)).not.toContain('rca_confidence_ok');
  });

  it('caps explanations', async () => {
    const { inferenceClient } = createInferenceClient(
      judgeOutput({ investigation_reasoning: 'z'.repeat(2000) })
    );

    const { scores } = await evaluate(inferenceClient);

    expect(scores[0].explanation).toHaveLength(MAX_EXPLANATION_LENGTH);
  });

  it('retries when the judge output does not match the schema', async () => {
    jest.useFakeTimers();
    const { prompt, inferenceClient } = createInferenceClient(
      { investigation_produced_evidence: 'yes' },
      judgeOutput()
    );

    const evaluation = evaluate(inferenceClient);
    await jest.advanceTimersByTimeAsync(5000);
    const { scores } = await evaluation;
    jest.useRealTimers();

    expect(prompt).toHaveBeenCalledTimes(2);
    expect(scores[0]).toMatchObject({ name: 'rca_investigation_complete', score: 1 });
  });

  it('does not retry inference client errors', async () => {
    const prompt = jest.fn().mockRejectedValue(new Error('Connector returned 401'));
    const inferenceClient = { prompt } as unknown as BoundInferenceClient;

    await expect(evaluate(inferenceClient)).rejects.toThrow('Connector returned 401');
    expect(prompt).toHaveBeenCalledTimes(1);
  });

  it('throws without an inference client', async () => {
    await expect(
      rcaRewardJudge.evaluate({ round, log: loggingSystemMock.createLogger() })
    ).rejects.toThrow('Inference client is required for the nightshift_rca_reward judge');
  });
});

describe('extractMaxConfidence', () => {
  it.each([
    ['root cause (85% confidence)', 0.85],
    ['confidence: 70%', 0.7],
    ['~60 % likely, maybe 90% chance', 0.9],
    ['probability 0.75', 0.75],
  ])('reads %p as %p', (text, expected) => {
    expect(extractMaxConfidence(text)).toBe(expected);
  });

  it('returns undefined when no confidence is stated', () => {
    expect(extractMaxConfidence('The deploy caused it; error rate rose 40%.')).toBeUndefined();
  });
});

describe('temporalProximityScore', () => {
  it.each([
    [0, 1],
    [5, 1],
    [30, 0.75],
    [120, 0.5],
    [720, 0.25],
    [721, 0.1],
  ])('scores a %p minute gap as %p', (minutes, expected) => {
    expect(temporalProximityScore(minutes)).toBe(expected);
  });

  it('returns undefined for a missing or negative gap', () => {
    expect(temporalProximityScore(undefined)).toBeUndefined();
    expect(temporalProximityScore(null)).toBeUndefined();
    expect(temporalProximityScore(-3)).toBeUndefined();
  });
});
